// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmitWishes } from './SubmitWishes';
import { questions } from './questions';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it('does not submit automatically and only confirms an acknowledged save', async () => {
  const user = userEvent.setup();
  const fetch = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(new Response(JSON.stringify({ saved: true }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  const onSent = vi.fn();
  render(<SubmitWishes answers={Object.fromEntries(questions.map((q) => [q.id, q.options[0].id]))} note="Ein Ausflug" invite={'a'.repeat(64)} sentSummary="" onSent={onSent} />);
  expect(fetch).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Wünsche senden' }));
  expect(screen.getByRole('alert').textContent).toContain('Ihre Antworten sind noch da');
  expect(onSent).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Wünsche senden' }));
  expect(onSent).toHaveBeenCalledWith(expect.stringContaining('Ein Ausflug'));
});
