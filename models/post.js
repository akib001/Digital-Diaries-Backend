const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    excerpt: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    featuredImageUrl: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    comments: [
      {
        userId: {
          type: String,
        },
        comment: {
          type: String
        },
        time: {
          type: Date
        }
      }
    ],
    upvoteCount: {
      type: Number,
      default: 0,
    },

    downvoteCount: {
      type: Number,
      default: 0,
    },
    votedUsers: [
      {
        userId: {
          type: String,
        },
        voteType: {
          type: String
        }
      }
    ],
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
