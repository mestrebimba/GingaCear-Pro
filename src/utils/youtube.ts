/**
 * Converts a standard YouTube URL to an embed URL.
 * Handles formats like:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * @param url The YouTube URL to convert
 * @returns The embed URL or the original URL if not a YouTube link
 */
export function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  
  // If it's already an embed URL, return it
  if (url.includes('youtube.com/embed/')) return url;

  let videoId = '';

  // Handle youtu.be/VIDEO_ID
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0];
  } 
  // Handle youtube.com/watch?v=VIDEO_ID
  else if (url.includes('youtube.com/watch')) {
    const urlParams = new URLSearchParams(url.split('?')[1]);
    videoId = urlParams.get('v') || '';
  }
  // Handle youtube.com/live/VIDEO_ID
  else if (url.includes('youtube.com/live/')) {
    videoId = url.split('youtube.com/live/')[1]?.split(/[?#]/)[0];
  }

  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }

  return url;
}
