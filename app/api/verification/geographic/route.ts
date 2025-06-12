import { NextRequest, NextResponse } from 'next/server';
import { verificationService } from '@/services/verification-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, deviceInfo } = body;

    if (!sessionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session ID is required' 
      }, { status: 400 });
    }

    // Extract IP address from request headers
    const ipAddress = getClientIpAddress(request);
    if (!ipAddress) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unable to determine IP address' 
      }, { status: 400 });
    }

    // Validate device info if provided
    if (deviceInfo) {
      const validationError = validateDeviceInfo(deviceInfo);
      if (validationError) {
        return NextResponse.json({ 
          success: false, 
          error: validationError 
        }, { status: 400 });
      }
    }

    // Load verification system (this would load from storage)
    const verificationSystem = verificationService.createVerificationSystem();

    const verificationRecord = await verificationService.performGeographicVerification(
      verificationSystem,
      sessionId,
      ipAddress,
      deviceInfo
    );

    return NextResponse.json({
      success: true,
      data: verificationRecord
    });

  } catch (error) {
    console.error('Error performing geographic verification:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to perform geographic verification' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const verificationId = url.searchParams.get('id');
    const sessionId = url.searchParams.get('sessionId');
    const ipAddress = url.searchParams.get('ipAddress');

    if (verificationId) {
      // Get specific geographic verification
      return NextResponse.json({ 
        success: false, 
        error: 'Geographic verification retrieval not yet implemented' 
      }, { status: 501 });
    } else if (ipAddress) {
      // Get IP information without creating verification
      try {
        const ipInfo = await getIpInformation(ipAddress);
        return NextResponse.json({
          success: true,
          data: ipInfo
        });
      } catch (error) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to get IP information' 
        }, { status: 500 });
      }
    } else {
      // List geographic verifications
      const filters = {
        sessionId,
        type: 'geographic'
      };

      return NextResponse.json({ 
        success: false, 
        error: 'Geographic verification listing not yet implemented',
        filters 
      }, { status: 501 });
    }

  } catch (error) {
    console.error('Error retrieving geographic verifications:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to retrieve geographic verifications' 
    }, { status: 500 });
  }
}

function getClientIpAddress(request: NextRequest): string | null {
  // Try various headers that might contain the real IP
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'x-forwarded',
    'x-cluster-client-ip',
    'forwarded-for',
    'forwarded'
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs, take the first one
      const ip = value.split(',')[0].trim();
      if (isValidIpAddress(ip)) {
        return ip;
      }
    }
  }

  // Fallback to connection remote address (if available)
  return null;
}

function isValidIpAddress(ip: string): boolean {
  // Basic IP validation (IPv4 and IPv6)
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  
  if (ipv4Regex.test(ip)) {
    // Validate IPv4 octets
    const octets = ip.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  return ipv6Regex.test(ip);
}

function validateDeviceInfo(deviceInfo: any): string | null {
  if (typeof deviceInfo !== 'object' || deviceInfo === null) {
    return 'Device info must be an object';
  }

  // Validate required fields
  if (deviceInfo.userAgent && typeof deviceInfo.userAgent !== 'string') {
    return 'User agent must be a string';
  }

  if (deviceInfo.platform && typeof deviceInfo.platform !== 'string') {
    return 'Platform must be a string';
  }

  if (deviceInfo.screenResolution && typeof deviceInfo.screenResolution !== 'string') {
    return 'Screen resolution must be a string';
  }

  if (deviceInfo.timezone && typeof deviceInfo.timezone !== 'string') {
    return 'Timezone must be a string';
  }

  if (deviceInfo.language && typeof deviceInfo.language !== 'string') {
    return 'Language must be a string';
  }

  if (deviceInfo.plugins && !Array.isArray(deviceInfo.plugins)) {
    return 'Plugins must be an array';
  }

  if (deviceInfo.isBot !== undefined && typeof deviceInfo.isBot !== 'boolean') {
    return 'isBot must be a boolean';
  }

  return null;
}

async function getIpInformation(ipAddress: string): Promise<any> {
  // This would integrate with IP geolocation services
  // For now, return mock data structure
  return {
    ipAddress,
    country: 'Unknown',
    region: 'Unknown',
    city: 'Unknown',
    latitude: null,
    longitude: null,
    timezone: 'UTC',
    isp: 'Unknown ISP',
    isVpn: false,
    isProxy: false,
    riskScore: Math.floor(Math.random() * 50), // 0-50 for mock
    timestamp: new Date().toISOString(),
    provider: 'mock_service'
  };
}

// Geographic verification configuration
export const GEOGRAPHIC_CONFIG = {
  trustedCountries: [
    'US', 'CA', 'GB', 'DE', 'FR', 'AU', 'NZ', 'JP', 'KR', 'SG'
  ],
  blockedCountries: [
    // Countries with high fraud risk or legal restrictions
  ],
  vpnDetection: {
    enabled: true,
    strictMode: false, // If true, VPN usage will fail verification
    allowedVpnProviders: [] // Whitelist of trusted VPN providers
  },
  proxyDetection: {
    enabled: true,
    blockAllProxies: true
  },
  riskScoring: {
    vpnPenalty: 30,
    proxyPenalty: 40,
    unknownCountryPenalty: 20,
    blockedCountryPenalty: 100,
    botDetectionPenalty: 50,
    frequentLocationChangePenalty: 25
  },
  ipGeolocationProviders: [
    {
      name: 'MaxMind GeoIP2',
      endpoint: 'https://geoip.maxmind.com/geoip/v2.1/city',
      features: ['country', 'region', 'city', 'isp', 'vpn_detection']
    },
    {
      name: 'IPinfo',
      endpoint: 'https://ipinfo.io',
      features: ['country', 'region', 'city', 'org', 'vpn_detection']
    },
    {
      name: 'IP2Location',
      endpoint: 'https://api.ip2location.com/v2',
      features: ['country', 'region', 'city', 'isp', 'proxy_detection']
    }
  ]
};

// Device fingerprinting configuration
export const DEVICE_FINGERPRINTING = {
  requiredFields: ['userAgent', 'platform'],
  optionalFields: ['screenResolution', 'timezone', 'language', 'plugins'],
  riskFactors: {
    missingUserAgent: 50,
    suspiciousUserAgent: 30,
    uncommonPlatform: 10,
    botIndicators: 60,
    inconsistentTimezone: 20,
    unusualScreenResolution: 10
  },
  trustedFingerprints: {
    // Fingerprints of known trusted devices can be stored here
    enabled: true,
    trustBonus: 20 // Confidence boost for trusted devices
  },
  fingerprintExpiry: 30 * 24 * 60 * 60 * 1000 // 30 days
};