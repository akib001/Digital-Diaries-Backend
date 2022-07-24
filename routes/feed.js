const express = require('express');
const { body } = require('express-validator/check');

const feedController = require('../controllers/feed');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

// GET /feed/posts
router.get('/posts', feedController.getPosts);

// POST /feed/post  -- CreatePost
router.post(
  '/post',
  isAuth,
  // [
  //   body('title')
  //     .trim()
  //     .isLength({ min: 5 }),
  //   body('content')
  //     .trim()
  //     .isLength({ min: 5 })
  // ],
  feedController.createPost
);

// GET /feed/post/:postId -- fetch single post
router.get('/post/:postId', feedController.getPost);


// PUT /feed/post/:postId
router.put(
  '/post/:postId',
  isAuth,
  [
    body('title')
      .trim()
      .isLength({ min: 5 }),
    body('content')
      .trim()
      .isLength({ min: 5 })
  ],
  feedController.updatePost
);

router.delete('/post/:postId', isAuth, feedController.deletePost);

router.post('/post-comment', isAuth, feedController.postComment);

router.post('/post/upvote', isAuth, feedController.upvotePost);

router.post('/post/downvote', isAuth, feedController.downvotePost);

module.exports = router;
