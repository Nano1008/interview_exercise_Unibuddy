import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { ObjectID } from 'mongodb';
import { MessageData } from './message.data';
import { ChatMessageModel, ChatMessageSchema} from './models/message.model';

import { ConfigManagerModule } from '../configuration/configuration-manager.module';
import {getTestConfiguration}  from '../configuration/configuration-manager.utils';
import { MessageTag, TagType } from "./models/message.dto";

const id = new ObjectID('5fe0cce861c8ea54018385af');
const conversationId = new ObjectID();
const senderId = new ObjectID('5fe0cce861c8ea54018385af');
const sender2Id = new ObjectID('5fe0cce861c8ea54018385aa');
const sender3Id = new ObjectID('5fe0cce861c8ea54018385ab');

class TestMessageData extends MessageData {
  async deleteMany() {
    await this.chatMessageModel.deleteMany();
  }
}

describe('MessageData', () => {
  let messageData: TestMessageData;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRootAsync({
          imports: [ConfigManagerModule],
          useFactory: () => {
            const databaseConfig =
              getTestConfiguration().database;
            return {
              uri: databaseConfig.connectionString,
            };
          },
        }),
        MongooseModule.forFeature([
          { name: ChatMessageModel.name, schema: ChatMessageSchema },
        ]),
      ],
      providers: [TestMessageData],
    }).compile();

    messageData = module.get<TestMessageData>(TestMessageData);
  });

  beforeEach(
    async () => {
      messageData.deleteMany();
    }
  );

  afterEach(async () => {
    messageData.deleteMany();
  });

  it('should be defined', () => {
    expect(messageData).toBeDefined();
  });

  describe('create', () => {
    it('should be defined', () => {
      expect(messageData.create).toBeDefined();
    });

    it('successfully creates a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      expect(message).toMatchObject(
        {
          likes: [],
          resolved: false,
          deleted: false,
          reactions: [],
          text: 'Hello world',
          senderId: senderId,
          conversationId: conversationId,
          conversation: { id: conversationId.toHexString() },
          likesCount: 0,
          sender: { id: senderId.toHexString() },
        }
      );

    });
  });


  describe('get', () => {
    it('should be defined', () => {
      expect(messageData.getMessage).toBeDefined();
    });

    it('successfully gets a message', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const gotMessage = await messageData.getMessage(sentMessage.id.toHexString())

      expect(gotMessage).toMatchObject(sentMessage)
    });
  });

  describe('delete', () => {
    it('successfully marks a message as deleted', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to delete' },
        senderId,
      );

      // Make sure that it started off as not deleted
      expect(message.deleted).toEqual(false);

      // And that is it now deleted
      const deletedMessage = await messageData.delete(new ObjectID(message.id));
      expect(deletedMessage.deleted).toEqual(true);
    });
  });

  describe('tag', () => {
    it('successfully tags a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to tag' },
        senderId,
      );
      const tag = new MessageTag();
      tag.id = 'tag1';
      tag.type = TagType.subTopic;
      const taggedMessage = await messageData.addTag(
        new ObjectID(message.id),
        tag,
      );

      expect(taggedMessage.tags).toEqual([expect.objectContaining(tag)]);
    });
  });

  describe('get', () => {
    it('successfully gets messages by tag', async () => {
      const conversationId = new ObjectID();
      const sentMessage = await messageData.create(
        { conversationId, text: 'Hello world' },
        senderId,
      );

      const tag = new MessageTag();
      tag.id = 'tag';
      tag.type = TagType.subTopic;
      const newMessage = await messageData.addTag(new ObjectID(sentMessage.id), tag);

      const gotMessages = await messageData.getMessagesByTag(tag);
      expect(gotMessages).toEqual([newMessage]);
    });
  });

  describe('reaction', () => {
    it('successfully adds a reaction to a message', async () => {
      const conversationId = new ObjectID();
      const message = await messageData.create(
        { conversationId, text: 'Message to react to' },
        senderId,
      );

      const reaction = 'like';
      const reactionUnicode = '👍';
      const updatedMessage = await messageData.addReaction(
        reaction,
        senderId,
        reactionUnicode,
        new ObjectID(message.id),
      );

      expect(updatedMessage.reactions).toEqual(
        [
          expect.objectContaining({
            reaction,
            reactionUnicode,
            userIds: [senderId.toHexString()],
          }),
        ]
      );
    });
  });


});
