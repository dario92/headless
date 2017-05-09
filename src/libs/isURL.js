import { parse } from 'url';

export default (url) => {
  try {
    const parsed = parse(url);
    return !!parsed.host;
  } catch (err) {
    return false;
  }
};
