// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_KEY, emptyDraft, readDraft, saveDraft } from './draft';

beforeEach(() => { sessionStorage.clear(); window.history.replaceState(null, '', '/'); vi.restoreAllMocks(); });

describe('tab-local drafts', () => {
  it('restores answers and notes after a reload and clamps navigation', () => {
    saveDraft({ answers: { fitness: 'yes' }, note: 'Mein Wunsch', step: 100, sentSummary: '' });
    expect(readDraft()).toEqual({ answers: { fitness: 'yes' }, note: 'Mein Wunsch', step: 3, sentSummary: '' });
  });
  it('rejects corrupt and expired drafts', () => {
    sessionStorage.setItem(DRAFT_KEY, '{broken');
    expect(readDraft()).toEqual(emptyDraft());
    saveDraft({ ...emptyDraft(), note: 'Yesterday' });
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 25 * 60 * 60 * 1000);
    expect(readDraft()).toEqual(emptyDraft());
  });
  it('continues without storage when the browser blocks it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    expect(saveDraft(emptyDraft())).toBe(false);
  });
  it('does not reuse a previous invitation’s draft or sent receipt', () => {
    saveDraft({ ...emptyDraft(), note: 'Previous invitation', sentSummary: 'Already sent' });
    window.history.replaceState(null, '', '/#invite=' + 'b'.repeat(64));
    expect(readDraft()).toEqual(emptyDraft());
  });
});
