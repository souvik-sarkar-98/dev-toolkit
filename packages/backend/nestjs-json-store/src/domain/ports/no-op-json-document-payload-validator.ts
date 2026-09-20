import { Injectable } from '@nestjs/common';
import { IJsonDocumentPayloadValidatorPort } from './json-document-payload-validator.port';

@Injectable()
export class NoOpJsonDocumentPayloadValidator implements IJsonDocumentPayloadValidatorPort {
  validate(_namespace: string, _key: string, _payload: Record<string, unknown>): void {
    // Permissive default — no schema registered means no validation.
  }
}
