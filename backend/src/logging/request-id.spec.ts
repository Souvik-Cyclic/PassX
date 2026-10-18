import { REQUEST_ID_HEADER, resolveRequestId } from './request-id';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('resolveRequestId', () => {
  it('names the header x-request-id', () => {
    expect(REQUEST_ID_HEADER).toBe('x-request-id');
  });

  it('echoes a well-formed incoming id', () => {
    expect(resolveRequestId('abc-123.XYZ_9')).toBe('abc-123.XYZ_9');
  });

  it('takes the first value when the header repeats', () => {
    expect(resolveRequestId(['first-id', 'second-id'])).toBe('first-id');
  });

  it('replaces an id longer than 128 characters', () => {
    expect(resolveRequestId('a'.repeat(129))).toMatch(UUID_V4);
  });

  it('keeps an id of exactly 128 characters', () => {
    const id = 'a'.repeat(128);
    expect(resolveRequestId(id)).toBe(id);
  });

  it('replaces an id containing a newline', () => {
    expect(resolveRequestId('abc\ninjected: header')).toMatch(UUID_V4);
  });

  it('replaces an id containing spaces or symbols', () => {
    expect(resolveRequestId('abc def;')).toMatch(UUID_V4);
  });

  it('generates a UUID when the header is missing', () => {
    expect(resolveRequestId(undefined)).toMatch(UUID_V4);
  });

  it('generates a UUID for an empty string', () => {
    expect(resolveRequestId('')).toMatch(UUID_V4);
  });
});
