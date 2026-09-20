import { describe, expect, it } from 'vitest';
import {
  buildCommentEditorValue,
  contentToEditableText,
  editableTextToContent,
  parseContentSegments,
  parseMentionedUserIds,
  syncMentionsWithContent,
} from './mention-tokens.js';

const alice = {
  userId: 'user-alice',
  displayName: 'Alice Smith',
  email: 'alice@example.com',
};

describe('mention tokens', () => {
  it('round-trips editable text and canonical content', () => {
    const editable = 'Hi @Alice Smith please review';
    const content = editableTextToContent(editable, [alice]);
    expect(content).toBe('Hi @[user-alice] please review');
    expect(contentToEditableText(content, [alice])).toBe(editable);
  });

  it('syncs mentions with content tokens only', () => {
    const content = 'Hello @[user-alice] and @[user-bob]';
    const mentions = syncMentionsWithContent(content, [
      alice,
      {
        userId: 'user-bob',
        displayName: 'Bob',
        email: 'bob@example.com',
      },
      {
        userId: 'user-eve',
        displayName: 'Eve',
        email: 'eve@example.com',
      },
    ]);
    expect(mentions.map((m) => m.userId).sort()).toEqual(['user-alice', 'user-bob']);
  });

  it('buildCommentEditorValue drops orphan mentions', () => {
    const value = buildCommentEditorValue('Thanks @Alice Smith', [alice]);
    expect(value.content).toBe('Thanks @[user-alice]');
    expect(value.mentions).toEqual([alice]);
    expect(parseMentionedUserIds(value.content)).toEqual(new Set(['user-alice']));
  });

  it('parseContentSegments renders mention labels', () => {
    const segments = parseContentSegments('Hi @[user-alice]!', [
      { userId: 'user-alice', displayName: 'Alice Smith' },
    ]);
    expect(segments).toEqual([
      { type: 'text', text: 'Hi ' },
      { type: 'mention', text: '@Alice Smith', userId: 'user-alice' },
      { type: 'text', text: '!' },
    ]);
  });
});
