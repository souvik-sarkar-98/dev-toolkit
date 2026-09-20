import 'zone.js';
import 'zone.js/testing';
import { afterEach } from 'vitest';
import { getTestBed, TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());

afterEach(() => {
  TestBed.resetTestingModule();
});
