import { HttpStatus } from '@nestjs/common';
import { BusinessError } from '../../domain/errors/business-error';

/**
 * Reviewed client-safe messages. Values must never include runtime data.
 * Unknown codes fall back to a status/category message, never Error.message.
 */
const PUBLIC_MESSAGES: Readonly<Record<string, string>> = {
  BUSINESS_ERROR: 'The request could not be completed.',

  USER_NOT_FOUND: 'User not found.',
  DUPLICATE_EMAIL: 'A user with this email already exists.',
  INVALID_STATUS_TRANSITION: 'Invalid user status transition.',
  PROFILE_INCOMPLETE: 'User profile is incomplete.',
  IDENTITY_NOT_LINKED: 'User does not have a linked identity provider account.',
  PROFILE_NOT_PROVISIONED: 'User profile is not provisioned. Contact an administrator.',
  IDENTITY_PROVIDER_ERROR: 'Identity provider operation failed.',
  INVALID_CREDENTIALS: 'Current credentials are incorrect.',

  REQUEST_NOT_FOUND: 'Request not found.',
  REQUEST_DEFINITION_NOT_FOUND: 'Request definition not found.',
  REQUEST_FORBIDDEN: 'You do not have permission to perform this request.',
  REQUEST_INVALID_STATE: 'The request is not in a valid state for this action.',
  DONOR_NOT_FOUND: 'Donor not found.',
  DUPLICATE_DONOR_EMAIL: 'A donor with this email already exists.',
  INVALID_DONOR_MERGE: 'The donors cannot be merged.',

  API_KEY_NOT_FOUND: 'API key not found.',
  API_KEY_EXPIRED: 'API key has expired.',
  INVALID_API_KEY: 'Invalid or expired API key.',
  INSUFFICIENT_PERMISSIONS: 'You do not have sufficient permissions.',
  ROLE_NOT_FOUND: 'Role not found.',
  PERMISSION_NOT_FOUND: 'Permission not found.',
  ROLE_GROUP_NOT_FOUND: 'Role group not found.',
  CATALOG_KEY_CONFLICT: 'A catalog entry with this key already exists.',
  CATALOG_IN_USE: 'The catalog entry cannot be deleted because it is still in use.',
  USER_ROLE_NOT_FOUND: 'User role assignment not found.',
  USER_ROLE_GROUP_NOT_FOUND: 'User role-group assignment not found.',
  USER_ROLE_ALREADY_REVOKED: 'User role assignment has already been revoked.',
  USER_PERMISSION_NOT_FOUND: 'User permission grant not found.',
  USER_PERMISSION_ALREADY_REVOKED: 'User permission grant has already been revoked.',
  USER_ROLE_GROUP_ALREADY_REVOKED: 'User role-group assignment has already been revoked.',

  ENTITY_TYPE_FORBIDDEN: 'Entity type is not supported.',
  ENTITY_ACCESS_DENIED: 'You do not have permission to access the requested resource.',
  DOCUMENT_NOT_FOUND: 'Document not found.',
  DOCUMENT_ACCESS_DENIED: 'You do not have permission to access the requested document.',
  DOCUMENT_ENTITY_TYPE_FORBIDDEN: 'Document entity type is not supported.',
  DOCUMENT_LIMIT_REACHED: 'Document limit reached for this resource.',
  FILE_SIZE_EXCEEDED: 'File size exceeds the allowed limit.',
  MIME_TYPE_NOT_ALLOWED: 'File type is not allowed.',
  FILE_METADATA_INVALID: 'File metadata is invalid.',
  DOCUMENT_NAME_INVALID: 'Document name is invalid.',
  DRIVE_FILE_NOT_FOUND: 'Drive file not found.',
  DRIVE_ACCESS_DENIED: 'Drive access denied.',
  DRIVE_OPERATION_FAILED: 'Drive operation failed.',
  DRIVE_UPLOAD_FAILED: 'Drive upload failed.',
  DRIVE_URL_MISSING: 'Drive did not return a usable URL.',

  COMMENT_NOT_FOUND: 'Comment not found.',
  COMMENT_ACCESS_DENIED: 'You do not have permission to access comments on this resource.',
  COMMENT_ENTITY_TYPE_FORBIDDEN: 'Comment entity type is not supported.',
  COMMENT_NOT_AUTHOR: 'You are not the author of this comment.',
  COMMENT_PARENT_MISMATCH: 'Parent comment belongs to a different resource.',
  COMMENT_INVALID: 'Comment is invalid.',

  NOTIFICATION_NOT_FOUND: 'Notification not found.',
  USER_NOTIFICATION_NOT_FOUND: 'User notification not found.',
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found.',
  TEMPLATE_NOT_FOUND: 'Message template not found.',
  NOTIFICATION_ALREADY_READ: 'Notification has already been read.',
  NOTIFICATION_ALREADY_ARCHIVED: 'Notification has already been archived.',
  TOKEN_NOT_AVAILABLE: 'OAuth token is not available.',
  EMAIL_DELIVERY_FAILED: 'Email delivery failed.',

  JSON_DOCUMENT_NOT_FOUND: 'JSON document not found.',
  JSON_DOCUMENT_KEY_NOT_FOUND: 'JSON document not found.',
  JSON_DOCUMENT_ALREADY_EXISTS: 'JSON document already exists.',
  JSON_DOCUMENT_INVALID: 'JSON document is invalid.',

  OAUTH_PROVIDER_NOT_CONFIGURED: 'OAuth provider is not configured.',
  OAUTH_INVALID_STATE: 'Invalid or expired OAuth state. Restart the authorization flow.',
  OAUTH_TOKEN_NOT_FOUND: 'OAuth token not found.',
  OAUTH_TOKEN_EXPIRED: 'OAuth token has expired. Re-authentication is required.',
  OAUTH_NO_REFRESH_TOKEN: 'OAuth token cannot be refreshed. Re-authentication is required.',
  OAUTH_INVALID_SCOPE: 'One or more requested OAuth scopes are not permitted.',
  OAUTH_SCOPE_NOT_ALLOWED: 'One or more requested OAuth scopes are not permitted.',
  OAUTH_INVALID_ENCRYPTED_TOKEN: 'Stored OAuth credentials are invalid.',
  OAUTH_DUPLICATE_AUTH_CODE: 'Authorization code has already been used. Restart the OAuth flow.',
  OAUTH_AMBIGUOUS_TOKEN_SELECTION: 'Multiple OAuth credentials matched the request.',
  OAUTH_CALLBACK_ERROR: 'OAuth callback failed. Restart the authorization flow.',

  CUSTOM_FORM_ACCESS_DENIED: 'You do not have permission to access this form.',
  CUSTOM_FORM_KEY_ALREADY_EXISTS: 'A form with this key already exists.',
  CUSTOM_FORM_FIELD_KEY_ALREADY_EXISTS: 'A field with this key already exists on the form.',
  CUSTOM_FORM_NOT_FOUND: 'Form not found.',
  CUSTOM_FORM_FIELD_NOT_FOUND: 'Form field not found.',
  CUSTOM_FORM_SUBMISSION_NOT_FOUND: 'Form submission not found.',
  CUSTOM_FORM_INVALID_VALUE: 'One or more form values are invalid.',
  CUSTOM_FORM_CONDITION_VIOLATED: 'A form field has an invalid conditional value.',
  CUSTOM_FORM_ENCRYPTION_KEY_MISSING: 'Encrypted form fields are unavailable.',
  CUSTOM_FORM_INVALID_DEFINITION: 'Form definition is invalid.',
  CUSTOM_FORM_MANDATORY_MISSING: 'A required form field is missing.',
  CUSTOM_FORM_VALIDATION_RULE_VIOLATED: 'A form field does not match the required format.',
  CUSTOM_FORM_INVALID_KEY: 'Form key format is invalid.',
  CUSTOM_FORM_NOT_PUBLISHED: 'Form is not published.',
  CUSTOM_FORM_DISABLED: 'Form is disabled.',
  CUSTOM_FORM_SUBMISSION_ALREADY_SUBMITTED: 'Form submission has already been submitted.',
  CUSTOM_FORM_SUBMISSION_INVALID: 'Form submission is invalid.',
  CUSTOM_FORM_FIELD_MUTATION_NOT_ALLOWED: 'Form fields cannot be changed in the current state.',

  INVALID_CRON_EXPRESSION: 'Cron expression is invalid.',
  CRON_JOB_NOT_FOUND: 'Cron job not found.',
  CRON_JOB_ALREADY_EXISTS: 'A cron job with this name already exists.',
  CRON_INVALID_TRIGGER_TIMESTAMP: 'Cron trigger timestamp is invalid.',

  QUEUE_JOB_INVALID_STATE_TRANSITION: 'Job cannot transition to the requested state.',
  JOB_NOT_FOUND: 'Job not found.',
  TRANSIENT_ERROR: 'The job failed temporarily.',
  PERMANENT_ERROR: 'The job could not be completed.',
  NETWORK_ERROR: 'The job failed because a dependent service was unavailable.',
  DATABASE_ERROR: 'The job failed because stored data was unavailable.',
  VALIDATION_ERROR: 'The job input is invalid.',
  EXTERNAL_SERVICE_ERROR: 'The job failed because an external service was unavailable.',
  RATE_LIMIT_ERROR: 'The job was rate limited.',
  TIMEOUT_ERROR: 'The job timed out.',
  BUSINESS_LOGIC_ERROR: 'The job could not be completed.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  INSUFFICIENT_RESOURCES: 'The job cannot run because required resources are unavailable.',

  HEALTH_INDICATOR_TIMEOUT: 'A health check timed out.',
  DUPLICATE_HEALTH_INDICATOR: 'Health check configuration is invalid.',
  INVALID_HEALTH_INDICATOR: 'Health check configuration is invalid.',
  INVALID_ALERT_MESSAGE: 'Alert message is invalid.',
};

const STATUS_MESSAGES: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'The request contains invalid data.',
  [HttpStatus.UNAUTHORIZED]: 'Authentication is required.',
  [HttpStatus.FORBIDDEN]: 'You do not have permission to perform this action.',
  [HttpStatus.NOT_FOUND]: 'The requested resource was not found.',
  [HttpStatus.CONFLICT]: 'The request conflicts with the current resource state.',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'The request could not be processed.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
};

export function resolvePublicErrorMessage(error: BusinessError): string {
  if (error.publicMessage) return error.publicMessage;

  const registered = PUBLIC_MESSAGES[error.errorCode];
  if (registered) return registered;

  if (error.errorCode.endsWith('_NOT_FOUND')) {
    return 'The requested resource was not found.';
  }
  if (
    error.errorCode.endsWith('_ACCESS_DENIED') ||
    error.errorCode.endsWith('_FORBIDDEN') ||
    error.errorCode.startsWith('INSUFFICIENT_')
  ) {
    return 'You do not have permission to perform this action.';
  }
  if (
    error.errorCode.endsWith('_ALREADY_EXISTS') ||
    error.errorCode.endsWith('_CONFLICT')
  ) {
    return 'The requested resource already exists.';
  }

  return (
    STATUS_MESSAGES[error.statusCode] ??
    (error.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'A service error occurred. Please try again later.'
      : 'The request could not be completed.')
  );
}
