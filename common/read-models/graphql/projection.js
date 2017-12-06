// @flow
import {
  STORY_COMMENTED,
  STORY_CREATED,
  STORY_UNVOTED,
  STORY_UPVOTED,
  USER_CREATED
} from '../../events'
import type {
  Event,
  StoryCommented,
  StoryCreated,
  StoryUnvoted,
  StoryUpvoted,
  UserCreated
} from '../../../flow-types/events'

export default {
  Init: async (store: any) => {
    const stories = await store.collection('stories')
    const comments = await store.collection('comments')
    const users = await store.collection('users')

    await stories.ensureIndex({ fieldName: 'id' })
    await comments.ensureIndex({ fieldName: 'id' })
    await comments.ensureIndex({ fieldName: 'parentId' })
    await users.ensureIndex({ fieldName: 'id' })
  },

  [STORY_COMMENTED]: async (
    store,
    {
      aggregateId,
      timestamp,
      payload: { parentId, userId, commentId, text }
    }: Event<StoryCommented>
  ) => {
    const comments = await store.collection('comments')

    const comment = {
      id: commentId,
      text,
      parentId,
      comments: [],
      storyId: aggregateId,
      createdAt: timestamp,
      createdBy: userId
    }

    await comments.insert(comment)

    await comments.update(
      { id: parentId },
      {
        $push: { comments: comment }
      }
    )

    const stories = await store.collection('stories')

    await stories.update({ id: aggregateId }, { $inc: { commentCount: 1 } })
  },

  [STORY_CREATED]: async (
    store,
    {
      aggregateId,
      timestamp,
      payload: { title, link, userId, text }
    }: Event<StoryCreated>
  ) => {
    const type = !link ? 'ask' : /^(Show HN)/.test(title) ? 'show' : 'story'

    const stories = await store.collection('stories')

    await stories.insert({
      id: aggregateId,
      type,
      title,
      text,
      link,
      commentCount: 0,
      votes: [],
      createdAt: timestamp,
      createdBy: userId
    })
  },

  [STORY_UPVOTED]: async (
    store,
    { aggregateId, payload: { userId } }: Event<StoryUpvoted>
  ) => {
    const stories = await store.collection('stories')

    await stories.update(
      { id: aggregateId },
      {
        $push: { votes: userId }
      }
    )
  },

  [STORY_UNVOTED]: async (
    store,
    { aggregateId, payload: { userId } }: Event<StoryUnvoted>
  ) => {
    const stories = await store.collection('stories')

    await stories.update(
      { id: aggregateId },
      {
        $pull: {
          votes: userId
        }
      }
    )
  },

  [USER_CREATED]: async (
    store,
    { aggregateId, timestamp, payload: { name } }: Event<UserCreated>
  ) => {
    const users = await store.collection('users')

    await users.insert({
      id: aggregateId,
      name,
      createdAt: timestamp
    })
  }
}