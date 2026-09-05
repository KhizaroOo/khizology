/** Working canvases, maintained here so destination changes do not touch the UI. */
export interface CampaignFormat {
  id: string;
  name: string;
  width: number;
  height: number;
  note: string;
  source?: string;
}

export const CAMPAIGN_FORMATS_REVIEWED = '2026-09-03';
export const campaignFormats: CampaignFormat[] = [
  { id: 'instagram-portrait', name: 'Instagram portrait canvas', width: 1080, height: 1350, note: 'Illustrative 4:5 working canvas. Check current placement requirements before export.' },
  { id: 'story', name: 'Story / Reel canvas', width: 1080, height: 1920, note: 'Illustrative 9:16 working canvas; reserve room for destination interface overlays.' },
  { id: 'youtube', name: 'YouTube video thumbnail', width: 3840, height: 2160, note: 'Recommended 16:9 thumbnail canvas. Upload size limits still apply.', source: 'https://support.google.com/youtube/answer/72431?hl=en' },
  { id: 'linkedin-square', name: 'LinkedIn square image ad', width: 1200, height: 1200, note: 'Recommended square single-image ad canvas.', source: 'https://www.linkedin.com/help/linkedin/answer/a426534/single-image-ads-advertising-specifications?lang=en-us' },
  { id: 'linkedin-portrait', name: 'LinkedIn portrait image ad', width: 720, height: 900, note: '4:5 single-image ad canvas; vertical ads serve on mobile.', source: 'https://www.linkedin.com/help/linkedin/answer/a426534/single-image-ads-advertising-specifications?lang=en-us' },
  { id: 'pinterest', name: 'Pinterest standard pin', width: 1000, height: 1500, note: 'Recommended 2:3 standard image Pin canvas.', source: 'https://help.pinterest.com/en/business/article/pinterest-product-specs' },
  { id: 'web-wide', name: 'Wide web banner canvas', width: 1920, height: 640, note: 'Illustrative 3:1 canvas. Match the actual website slot before production.' },
  { id: 'print', name: 'A4-proportion print canvas', width: 2480, height: 3508, note: 'Approximate A4 proportions near 300 PPI, without bleed. Confirm printer specifications.' },
];
