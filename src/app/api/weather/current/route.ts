import { NextResponse } from "next/server";

type NominatimResult = {
  address?: {
    state?: string;
    city?: string;
  };
};

type ForecastResult = {
  current?: {
    weather_code: number;
    temperature_2m: number;
  };
};

const weatherCodeMap: Record<number, string> = {
  0: "晴",
  1: "大致晴朗",
  2: "多云",
  3: "阴",
  45: "雾",
  48: "冻雾",
  51: "小毛雨",
  53: "毛雨",
  55: "较强毛雨",
  56: "冻毛雨",
  57: "较强冻毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  66: "冻雨",
  67: "较强冻雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  77: "雪粒",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  85: "阵雪",
  86: "强阵雪",
  95: "雷暴",
  96: "雷暴夹小冰雹",
  99: "雷暴夹大冰雹",
};

async function reverseGeocode(latitude: string, longitude: string) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=zh`,
      {
        cache: "no-store",
        headers: { "User-Agent": "diary-app/1.0" },
      },
    );

    if (!response.ok) {
      return "";
    }

    const data = (await response.json()) as NominatimResult;
    return (
      data.address?.state ??
      data.address?.city ??
      ""
    );
  } catch {
    return "";
  }
}

async function fetchForecast(latitude: string, longitude: string) {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    throw new Error("天气获取失败");
  }

  return (await response.json()) as ForecastResult;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = searchParams.get("lat");
  const longitude = searchParams.get("lon");

  if (!latitude || !longitude) {
    return NextResponse.json(
      {
        error: "缺少经纬度参数。",
      },
      { status: 400 },
    );
  }

  try {
    const [placeName, forecast] = await Promise.all([
      reverseGeocode(latitude, longitude),
      fetchForecast(latitude, longitude),
    ]);

    const weatherCode = forecast.current?.weather_code;
    const weatherLabel =
      typeof weatherCode === "number" ? weatherCodeMap[weatherCode] ?? "未知天气" : "未知天气";
    const temperature = forecast.current?.temperature_2m;
    const temperatureLabel =
      typeof temperature === "number" ? `${Math.round(temperature)}°C` : "";

    return NextResponse.json({
      locationName: placeName,
      weatherLabel,
      temperatureLabel,
      summary: [placeName, weatherLabel, temperatureLabel].filter(Boolean).join(" · "),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "天气自动识别失败。",
      },
      { status: 500 },
    );
  }
}
