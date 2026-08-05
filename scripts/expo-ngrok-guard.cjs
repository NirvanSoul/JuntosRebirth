/*
 * @expo/ngrok 4.1.3 assumes every request error includes `response.body`.
 * A short-lived failure in ngrok's local API has no response, so that package
 * throws a TypeError and prevents Expo CLI from applying its own retries.
 *
 * Keep this preload isolated to `npm run tunnel` and remove it when Expo's
 * ngrok client normalizes response-less errors upstream.
 */
const { NgrokClient, NgrokClientError } = require('@expo/ngrok/src/client');

function normalizeClientError(error) {
  const response = error?.response;
  const responseBody = response?.body;
  let body = responseBody;

  if (typeof responseBody === 'string') {
    try {
      body = JSON.parse(responseBody);
    } catch {
      body = undefined;
    }
  }

  const message =
    body?.msg ??
    (typeof responseBody === 'string' && responseBody
      ? responseBody
      : undefined) ??
    error?.message ??
    'No se pudo comunicar con la API local de ngrok.';

  return new NgrokClientError(
    message,
    response,
    body && typeof body === 'object' ? body : { msg: message },
  );
}

NgrokClient.prototype.request = async function request(
  method,
  path,
  options = {},
) {
  try {
    const requestOptions =
      method === 'get' ? { searchParams: options } : { json: options };
    return await this.internalApi[method](path, requestOptions).json();
  } catch (error) {
    throw normalizeClientError(error);
  }
};

NgrokClient.prototype.booleanRequest = async function booleanRequest(
  method,
  path,
  options = {},
) {
  try {
    const response = await this.internalApi[method](path, { json: options });
    return response.statusCode === 204;
  } catch (error) {
    throw normalizeClientError(error);
  }
};
