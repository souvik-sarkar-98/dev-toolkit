# comment-core

Framework-agnostic mention tokens and autocomplete state. No DOM or framework imports.

## Responsibility

- Mention token parse/insert (`getActiveMentionQuery`, `insertMentionInEditableText`)
- Editor value builders and payloads
- Autocomplete debounce, stale-request protection, and keyboard commands (`MentionAutocompleteController`, `mentionCommandFromKey`)

## Adapters

React and Angular only translate browser events into `MentionKeyCommand`s and render `MentionAutocompleteState`.

```ts
import { MentionAutocompleteController, mentionCommandFromKey } from '@ssdev-toolkit/comment-core';

const ac = new MentionAutocompleteController({ searchUsers, debounceMs: 200 });
ac.setQuery(query);
const command = mentionCommandFromKey(event.key);
if (command) ac.handleCommand(command);
```

React Native can drive the same controller from a `TextInput` selection.

## Framework-only leftovers

- Textarea DOM, cursor `setSelectionRange`, Angular CVA, and listbox markup stay in adapters.
