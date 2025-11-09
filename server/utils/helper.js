export const formatMessage = (username, text) => ({
  username,
  text,
  time: new Date().toISOString()
});
