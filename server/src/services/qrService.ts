import QRCode from 'qrcode';

/**
 * Generate QR code data URL for a game join URL
 */
export async function generateQRCode(joinUrl: string): Promise<string> {
  try {
    // Generate QR code as data URL (base64 image)
    const qrCodeDataUrl = await QRCode.toDataURL(joinUrl, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate join URL for a game code
 */
export function getJoinUrl(gameCode: string): string {
  const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  return `${baseUrl}/join/${gameCode}`;
}
