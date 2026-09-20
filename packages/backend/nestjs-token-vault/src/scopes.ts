/**
 * Google OAuth 2.0 scope constants.
 * Pass any combination into `googleOAuth.allowedScopes` in TokenVaultModule options.
 * Full reference: https://developers.google.com/identity/protocols/oauth/scopes
 */
export const GOOGLE_SCOPES = {
  // ── Gmail ────────────────────────────────────────────────────────────────
  /** Send email on behalf of the user. */
  gmailSend: "https://www.googleapis.com/auth/gmail.send",
  /** Read, compose, send, and permanently delete all email. */
  gmailFull: "https://www.googleapis.com/auth/gmail.modify",
  /** Read all resources and their metadata — no write operations. */
  gmailReadonly: "https://www.googleapis.com/auth/gmail.readonly",
  /** Manage drafts and send emails. */
  gmailCompose: "https://www.googleapis.com/auth/gmail.compose",
  /** Manage mailbox labels. */
  gmailLabels: "https://www.googleapis.com/auth/gmail.labels",
  /** Add emails into Gmail (import). */
  gmailInsert: "https://www.googleapis.com/auth/gmail.insert",
  /** Manage basic mail settings. */
  gmailSettings: "https://www.googleapis.com/auth/gmail.settings.basic",
  /** Manage sensitive mail settings (e.g. forwarding rules). */
  gmailSettingsSensitive: "https://www.googleapis.com/auth/gmail.settings.sharing",

  // ── Google Calendar ──────────────────────────────────────────────────────
  /** Full read/write access to calendars. */
  calendar: "https://www.googleapis.com/auth/calendar",
  /** Read/write access to calendar events. */
  calendarEvents: "https://www.googleapis.com/auth/calendar.events",
  /** Read-only access to calendars. */
  calendarReadonly: "https://www.googleapis.com/auth/calendar.readonly",
  /** Read-only access to calendar events. */
  calendarEventsReadonly: "https://www.googleapis.com/auth/calendar.events.readonly",

  // ── Google Drive ─────────────────────────────────────────────────────────
  /** Full access to all Drive files. */
  driveFull: "https://www.googleapis.com/auth/drive",
  /** Create and modify only files created by this app. */
  driveFile: "https://www.googleapis.com/auth/drive.file",
  /** Read-only access to file metadata and content. */
  driveReadonly: "https://www.googleapis.com/auth/drive.readonly",
  /** Read and write access to file metadata (not content). */
  driveMetadata: "https://www.googleapis.com/auth/drive.metadata",
  /** Read-only access to file metadata. */
  driveMetadataReadonly: "https://www.googleapis.com/auth/drive.metadata.readonly",
  /** Special scope for Drive app data folder. */
  driveAppdata: "https://www.googleapis.com/auth/drive.appdata",
  /** Full access required to read and write shared/Team Drives. */
  driveSharedDrives: "https://www.googleapis.com/auth/drive",

  // ── Google Docs ──────────────────────────────────────────────────────────
  /** Create and modify Google Docs documents. */
  docs: "https://www.googleapis.com/auth/documents",
  /** Read-only access to Google Docs. */
  docsReadonly: "https://www.googleapis.com/auth/documents.readonly",

  // ── Google Sheets ────────────────────────────────────────────────────────
  /** Create and modify Google Sheets. */
  sheets: "https://www.googleapis.com/auth/spreadsheets",
  /** Read-only access to Google Sheets. */
  sheetsReadonly: "https://www.googleapis.com/auth/spreadsheets.readonly",

  // ── Google Slides ────────────────────────────────────────────────────────
  /** Create and modify Google Slides presentations. */
  slides: "https://www.googleapis.com/auth/presentations",
  /** Read-only access to Google Slides. */
  slidesReadonly: "https://www.googleapis.com/auth/presentations.readonly",

  // ── Google Forms ─────────────────────────────────────────────────────────
  /** Create and modify Google Forms. */
  forms: "https://www.googleapis.com/auth/forms.body",
  /** Read Google Forms responses. */
  formsResponses: "https://www.googleapis.com/auth/forms.responses.readonly",

  // ── Google People / Contacts ─────────────────────────────────────────────
  /** Read/write access to contacts. */
  contacts: "https://www.googleapis.com/auth/contacts",
  /** Read-only access to contacts. */
  contactsReadonly: "https://www.googleapis.com/auth/contacts.readonly",
  /** Access the user's other contacts (non-contact people). */
  contactsOtherReadonly: "https://www.googleapis.com/auth/contacts.other.readonly",
  /** Read user profile information. */
  userinfo: "https://www.googleapis.com/auth/userinfo.profile",
  /** Read user email address. */
  userinfoEmail: "https://www.googleapis.com/auth/userinfo.email",

  // ── Google Tasks ─────────────────────────────────────────────────────────
  /** Create, edit, and delete task lists and tasks. */
  tasks: "https://www.googleapis.com/auth/tasks",
  /** Read-only access to tasks. */
  tasksReadonly: "https://www.googleapis.com/auth/tasks.readonly",

  // ── Google Chat ──────────────────────────────────────────────────────────
  /** Send messages and manage memberships in Google Chat. */
  chat: "https://www.googleapis.com/auth/chat.messages",
  /** Create Google Chat spaces and conversations. */
  chatSpaces: "https://www.googleapis.com/auth/chat.spaces",
  /** Read messages in Google Chat. */
  chatReadonly: "https://www.googleapis.com/auth/chat.messages.readonly",

  // ── Google Meet ──────────────────────────────────────────────────────────
  /** Create and manage Google Meet conferences. */
  meet: "https://www.googleapis.com/auth/meetings.space.created",

  // ── Admin SDK ────────────────────────────────────────────────────────────
  /** Manage users in Google Workspace. */
  adminDirectory: "https://www.googleapis.com/auth/admin.directory.user",
  /** Read-only access to Google Workspace directory. */
  adminDirectoryReadonly: "https://www.googleapis.com/auth/admin.directory.user.readonly",
  /** Manage Google Workspace groups. */
  adminGroups: "https://www.googleapis.com/auth/admin.directory.group",

  // ── Cloud ────────────────────────────────────────────────────────────────
  /** Access Google Cloud Platform APIs. */
  cloudPlatform: "https://www.googleapis.com/auth/cloud-platform",
  /** Read access to Google Cloud Storage objects. */
  storageReadonly: "https://www.googleapis.com/auth/devstorage.read_only",
  /** Full access to Google Cloud Storage. */
  storageFull: "https://www.googleapis.com/auth/devstorage.full_control",

  // ── YouTube ──────────────────────────────────────────────────────────────
  /** Manage YouTube account. */
  youtube: "https://www.googleapis.com/auth/youtube",
  /** Read-only access to YouTube data. */
  youtubeReadonly: "https://www.googleapis.com/auth/youtube.readonly",
  /** Upload videos to YouTube. */
  youtubeUpload: "https://www.googleapis.com/auth/youtube.upload",
} as const;

export type GoogleScope = (typeof GOOGLE_SCOPES)[keyof typeof GOOGLE_SCOPES];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Microsoft Graph permission scope constants.
 * Pass any combination into `microsoftOAuth.allowedScopes` in TokenVaultModule options.
 * Full reference: https://learn.microsoft.com/en-us/graph/permissions-reference
 */
export const MICROSOFT_SCOPES = {
  // ── User ─────────────────────────────────────────────────────────────────
  /** Read the signed-in user's profile. */
  userRead: "User.Read",
  /** Read all users' full profiles (requires admin consent). */
  userReadAll: "User.Read.All",
  /** Read and write the signed-in user's profile. */
  userReadWrite: "User.ReadWrite",
  /** Read and write all users' profiles (requires admin consent). */
  userReadWriteAll: "User.ReadWrite.All",

  // ── Mail ─────────────────────────────────────────────────────────────────
  /** Read the signed-in user's mail. */
  mailRead: "Mail.Read",
  /** Read and write the signed-in user's mail. */
  mailReadWrite: "Mail.ReadWrite",
  /** Send mail as the signed-in user. */
  mailSend: "Mail.Send",
  /** Read the signed-in user's mailbox settings. */
  mailboxSettings: "MailboxSettings.Read",
  /** Read and write the signed-in user's mailbox settings. */
  mailboxSettingsReadWrite: "MailboxSettings.ReadWrite",

  // ── Calendar ─────────────────────────────────────────────────────────────
  /** Read the signed-in user's calendars. */
  calendarsRead: "Calendars.Read",
  /** Read and write the signed-in user's calendars. */
  calendarsReadWrite: "Calendars.ReadWrite",
  /** Read calendars the user can access. */
  calendarsReadShared: "Calendars.Read.Shared",
  /** Read and write calendars the user can access. */
  calendarsReadWriteShared: "Calendars.ReadWrite.Shared",

  // ── Files / OneDrive ─────────────────────────────────────────────────────
  /** Read the signed-in user's files. */
  filesRead: "Files.Read",
  /** Read all files the signed-in user can access. */
  filesReadAll: "Files.Read.All",
  /** Read and write the signed-in user's files. */
  filesReadWrite: "Files.ReadWrite",
  /** Read and write all files the signed-in user can access. */
  filesReadWriteAll: "Files.ReadWrite.All",
  /** Read and write files in a specific SharePoint site. */
  filesReadWriteAppFolder: "Files.ReadWrite.AppFolder",

  // ── SharePoint / Sites ───────────────────────────────────────────────────
  /** Read items in all site collections. */
  sitesRead: "Sites.Read.All",
  /** Read and write items in all site collections. */
  sitesReadWrite: "Sites.ReadWrite.All",
  /** Create, edit, and delete sites. */
  sitesManage: "Sites.Manage.All",
  /** Full control of all site collections (requires admin consent). */
  sitesFullControl: "Sites.FullControl.All",

  // ── Contacts ─────────────────────────────────────────────────────────────
  /** Read the signed-in user's contacts. */
  contactsRead: "Contacts.Read",
  /** Read and write the signed-in user's contacts. */
  contactsReadWrite: "Contacts.ReadWrite",
  /** Read contacts the user has access to. */
  contactsReadShared: "Contacts.Read.Shared",

  // ── Teams ─────────────────────────────────────────────────────────────────
  /** Read the names and descriptions of Teams. */
  teamsRead: "Team.ReadBasic.All",
  /** Create teams. */
  teamsCreate: "Team.Create",
  /** Read and write Teams and channels. */
  channelRead: "Channel.ReadBasic.All",
  /** Read channel messages. */
  channelMessagesRead: "ChannelMessage.Read.All",
  /** Send channel messages. */
  channelMessagesSend: "ChannelMessage.Send",

  // ── Chat ─────────────────────────────────────────────────────────────────
  /** Read the signed-in user's 1:1 and group chats. */
  chatRead: "Chat.Read",
  /** Read and write the signed-in user's chats. */
  chatReadWrite: "Chat.ReadWrite",
  /** Send chat messages. */
  chatMessageSend: "ChatMessage.Send",

  // ── Tasks / Planner ──────────────────────────────────────────────────────
  /** Read the signed-in user's tasks. */
  tasksRead: "Tasks.Read",
  /** Read and write the signed-in user's tasks. */
  tasksReadWrite: "Tasks.ReadWrite",
  /** Read all planner tasks (requires admin consent). */
  tasksReadAll: "Tasks.Read.All",

  // ── Notes / OneNote ──────────────────────────────────────────────────────
  /** Read the signed-in user's OneNote notebooks. */
  notesRead: "Notes.Read",
  /** Read and write the signed-in user's OneNote notebooks. */
  notesReadWrite: "Notes.ReadWrite",
  /** Read all OneNote notebooks the user can access. */
  notesReadAll: "Notes.Read.All",
  /** Read and write all OneNote notebooks the user can access. */
  notesReadWriteAll: "Notes.ReadWrite.All",

  // ── Presence ─────────────────────────────────────────────────────────────
  /** Read presence information of all users. */
  presenceRead: "Presence.Read",
  /** Read presence information of all users (requires admin consent). */
  presenceReadAll: "Presence.Read.All",

  // ── Directory ────────────────────────────────────────────────────────────
  /** Read directory data (requires admin consent). */
  directoryRead: "Directory.Read.All",
  /** Read and write directory data (requires admin consent). */
  directoryReadWrite: "Directory.ReadWrite.All",

  // ── Groups ───────────────────────────────────────────────────────────────
  /** Read all groups. */
  groupRead: "Group.Read.All",
  /** Read and write all groups. */
  groupReadWrite: "Group.ReadWrite.All",
  /** Read basic group properties. */
  groupMemberRead: "GroupMember.Read.All",

  // ── Reports ──────────────────────────────────────────────────────────────
  /** Read all usage reports (requires admin consent). */
  reportsRead: "Reports.Read.All",

  // ── OpenID Connect defaults (always included) ────────────────────────────
  /** Verify the user's identity. */
  openid: "openid",
  /** Read the user's basic profile. */
  profile: "profile",
  /** Read the user's email address. */
  email: "email",
  /** Obtain a refresh token. */
  offlineAccess: "offline_access",
} as const;

export type MicrosoftScope = (typeof MICROSOFT_SCOPES)[keyof typeof MICROSOFT_SCOPES];
