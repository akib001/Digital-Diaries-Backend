const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const Post = require('../models/post');
const User = require('../models/user');

exports.getPosts = async (req, res, next) => {
  try {
    const posts = await Post.find({});
    res.status(200).json({
      message: 'Fetched posts successfully.',
      posts: posts,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  const { title, excerpt, content, featuredImageUrl, category } = req.body;

  const post = new Post({
    title,
    excerpt,
    content,
    featuredImageUrl,
    category,
    author: req.userId,
  });

  try {
    const savedPost = await post.save();
    const user = await User.findById(req.userId);

    user.posts.push(post);
    const savedUser = await user.save();

    res.status(201).json({
      message: 'Post created successfully!',
      post: post,
      author: { _id: user._id, name: user.name },
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: 'Post fetched.', post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  const { title, excerpt, content, featuredImageUrl, category } = req.body;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    // checking post author
    if (post.author.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }

    // Updating post
    post.title = title;
    post.excerpt = excerpt;
    post.content = content;
    post.featuredImageUrl = featuredImageUrl;
    post.category = category;

    const updatedPost = await post.save();

    res.status(200).json({ message: 'Post updated!', post: updatedPost });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    // Checks author permission
    if (post.author.toString() !== req.userId) {
      const error = new Error('Not authorized!');
      error.statusCode = 403;
      throw error;
    }
    const removedPost = await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);

    // removing post id from user db
    const index = user.posts.indexOf(postId);
    if (index > -1) {
      // only splice array when item is found
      user.posts.splice(index, 1); // 2nd parameter means remove one item only
    }

    const updateUser = await user.save();
    res.status(200).json({ message: 'post deleted' });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.postComment = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  const postId = req.body.postId;
  const comment = req.body.comment;

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error('Could not find post.');
        error.statusCode = 404;
        throw error;
      }
      post.comments.push(comment);
      return post.save();
    })
    .then((result) => {
      res.status(200).json({ message: 'Comment Added!', post: result });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.upvotePost = async (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.userId;
  const errors = validationResult(req);
  let voteResult;

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    let votedUser;

    post.votedUsers.forEach((element) => {
      if (element.userId === userId) {
        votedUser = userId;
        return;
      }
    });

    // if user has a vote
    if (votedUser) {
      const upvoteExist = await Post.findOne({
        votedUsers: { $elemMatch: { userId: userId, voteType: 'upvote' } },
      }).select('votedUsers');

      // if User Already has upvote
      if (upvoteExist) {

        voteResult = await Post.findByIdAndUpdate(
          postId,
          {
            $pull: { votedUsers: { userId: userId, voteType: 'upvote' } },
            $inc: { upvoteCount: -1 },
          },
          { new: true }
        );
        return res.status(200).json({
          message: 'vote removed',
          voteResult,
          upvoteCount: voteResult.upvoteCount,
          downvoteCount: voteResult.downvoteCount,
          voteRemove: true,
        });
      } else {
        // user has downvote. so we change votetype to upvote and increment upvote count and decrement downvote count
        voteResult = await Post.findOneAndUpdate(
          { votedUsers: { $elemMatch: { userId: userId } } },
          {
            $set: { 'votedUsers.$.voteType': 'upvote' },
            $inc: { upvoteCount: 1, downvoteCount: -1 },
          },
          { new: true }
        );
      }
    } else {
      // user doesn't have a vote
      voteResult = await Post.findByIdAndUpdate(
        postId,
        {
          $push: { votedUsers: { userId: userId, voteType: 'upvote' } },
          $inc: { upvoteCount: 1 },
        },
        { new: true }
      );
    }
    res.status(200).json({
      message: 'vote updated',
      voteResult,
      upvoteCount: voteResult.upvoteCount,
      downvoteCount: voteResult.downvoteCount,
      voteRemove: false,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.downvotePost = async (req, res, next) => {
  const postId = req.body.postId;
  const userId = req.userId;
  const errors = validationResult(req);
  let voteResult;

  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }

  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error('Could not find post.');
      error.statusCode = 404;
      throw error;
    }

    let votedUser;

    post.votedUsers.forEach((element) => {
      if (element.userId === userId) {
        votedUser = userId;
        return;
      }
    });

    // if user has a vote
    if (votedUser) {
      const downvoteExist = await Post.findOne({
        votedUsers: { $elemMatch: { userId: userId, voteType: 'downvote' } },
      }).select('votedUsers');

      // if User Already has upvote
      if (downvoteExist) {
        voteResult = await Post.findByIdAndUpdate(
          postId,
          {
            $pull: { votedUsers: { userId: userId, voteType: 'downvote' } },
            $inc: { downvoteCount: -1 },
          },
          { new: true }
        );
        return res.status(200).json({
          message: 'downvote removed',
          voteResult,
          upvoteCount: voteResult.upvoteCount,
          downvoteCount: voteResult.downvoteCount,
          voteRemove: true,
        });
      } else {
        // user has upvote. so we change votetype to downvote and increment downvote count and decrement upvote count
        voteResult = await Post.findOneAndUpdate(
          { votedUsers: { $elemMatch: { userId: userId } } },
          {
            $set: { 'votedUsers.$.voteType': 'downvote' },
            $inc: { upvoteCount: -1, downvoteCount: 1 },
          },
          { new: true }
        );
      }
    } else {
      // user doesn't have a vote
      voteResult = await Post.findByIdAndUpdate(
        postId,
        {
          $push: { votedUsers: { userId: userId, voteType: 'downvote' } },
          $inc: { downvoteCount: 1 },
        },
        { new: true }
      );
    }
    res.status(200).json({
      message: 'vote updated',
      voteResult,
      upvoteCount: voteResult.upvoteCount,
      downvoteCount: voteResult.downvoteCount,
      voteRemove: false,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

