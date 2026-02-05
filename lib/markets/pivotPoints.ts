type OHLCData = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type PivotLevels = {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
};

/**
 * Busca dados OHLC do CoinGecko
 * @param coingeckoId - ID do ativo no CoinGecko (ex: "bitcoin")
 * @param days - Número de dias de histórico
 */
async function fetchOHLC(
  coingeckoId: string,
  days: number,
): Promise<OHLCData[]> {
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`CoinGecko OHLC failed: ${res.status}`);
    }

    const data = await res.json();

    // CoinGecko retorna array de [timestamp, open, high, low, close]
    return data.map((candle: number[]) => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
    }));
  } catch (error) {
    console.error(`Failed to fetch OHLC for ${coingeckoId}:`, error);
    return [];
  }
}

/**
 * Calcula Pivot Points (Standard)
 * @param high - Preço máximo do período
 * @param low - Preço mínimo do período
 * @param close - Preço de fechamento do período
 */
function calculatePivotPoints(
  high: number,
  low: number,
  close: number,
): PivotLevels {
  const pivot = (high + low + close) / 3;

  const r1 = 2 * pivot - low;
  const r2 = pivot + (high - low);
  const r3 = high + 2 * (pivot - low);

  const s1 = 2 * pivot - high;
  const s2 = pivot - (high - low);
  const s3 = low - 2 * (high - pivot);

  return { pivot, r1, r2, r3, s1, s2, s3 };
}

/**
 * Calcula key levels para um ativo
 * @param coingeckoId - ID do ativo no CoinGecko
 * @param currentPrice - Preço atual do ativo
 */

export async function calculateKeyLevels(
  coingeckoId: string | null,
  currentPrice: number,
): Promise<{
  supports: Array<{ price: number; distance: string; timeframe: string }>;
  resistances: Array<{ price: number; distance: string; timeframe: string }>;
}> {
  // Fallback para mocks se não tiver coingeckoId
  if (!coingeckoId || currentPrice <= 0) {
    return {
      supports: [
        { price: currentPrice * 0.96, distance: "4.0%", timeframe: "Daily" },
        { price: currentPrice * 0.93, distance: "7.0%", timeframe: "Weekly" },
        { price: currentPrice * 0.9, distance: "10.0%", timeframe: "HTF" },
      ],
      resistances: [
        { price: currentPrice * 1.04, distance: "4.0%", timeframe: "Daily" },
        { price: currentPrice * 1.07, distance: "7.0%", timeframe: "Weekly" },
        { price: currentPrice * 1.1, distance: "10.0%", timeframe: "HTF" },
      ],
    };
  }

  try {
    // Buscar 30 dias de uma vez só (1 chamada API)
    const ohlcData = await fetchOHLC(coingeckoId, 30);

    if (ohlcData.length === 0) {
      throw new Error("No OHLC data available");
    }

    const allSupports: Array<{
      price: number;
      distance: string;
      timeframe: string;
    }> = [];
    const allResistances: Array<{
      price: number;
      distance: string;
      timeframe: string;
    }> = [];

    // Calcular pivots diários (último dia)
    if (ohlcData.length >= 1) {
      const lastDay = ohlcData[ohlcData.length - 1];
      const dailyPivots = calculatePivotPoints(
        lastDay.high,
        lastDay.low,
        lastDay.close,
      );

      allSupports.push(
        { price: dailyPivots.s1, distance: "", timeframe: "Daily" },
        { price: dailyPivots.s2, distance: "", timeframe: "Daily" },
        { price: dailyPivots.s3, distance: "", timeframe: "Daily" },
      );

      allResistances.push(
        { price: dailyPivots.r1, distance: "", timeframe: "Daily" },
        { price: dailyPivots.r2, distance: "", timeframe: "Daily" },
        { price: dailyPivots.r3, distance: "", timeframe: "Daily" },
      );
    }

    // Calcular pivots semanais (últimos 7 dias)
    if (ohlcData.length >= 7) {
      const last7Days = ohlcData.slice(-7);
      const weekHigh = Math.max(...last7Days.map((d) => d.high));
      const weekLow = Math.min(...last7Days.map((d) => d.low));
      const weekClose = last7Days[last7Days.length - 1].close;

      const weeklyPivots = calculatePivotPoints(weekHigh, weekLow, weekClose);

      allSupports.push(
        { price: weeklyPivots.s1, distance: "", timeframe: "Weekly" },
        { price: weeklyPivots.s2, distance: "", timeframe: "Weekly" },
      );

      allResistances.push(
        { price: weeklyPivots.r1, distance: "", timeframe: "Weekly" },
        { price: weeklyPivots.r2, distance: "", timeframe: "Weekly" },
      );
    }

    // Calcular pivots mensais (últimos 30 dias - HTF)
    if (ohlcData.length >= 30) {
      const monthHigh = Math.max(...ohlcData.map((d) => d.high));
      const monthLow = Math.min(...ohlcData.map((d) => d.low));
      const monthClose = ohlcData[ohlcData.length - 1].close;

      const monthlyPivots = calculatePivotPoints(
        monthHigh,
        monthLow,
        monthClose,
      );

      allSupports.push({
        price: monthlyPivots.s1,
        distance: "",
        timeframe: "HTF",
      });

      allResistances.push({
        price: monthlyPivots.r1,
        distance: "",
        timeframe: "HTF",
      });
    }

    // Filtrar e ordenar suportes (abaixo do preço atual)
    const supports = allSupports
      .filter((s) => s.price < currentPrice && s.price > 0)
      .sort((a, b) => b.price - a.price) // Mais próximo primeiro
      .slice(0, 3)
      .map((s) => ({
        ...s,
        distance: `${(((currentPrice - s.price) / currentPrice) * 100).toFixed(1)}%`,
      }));

    // Filtrar e ordenar resistências (acima do preço atual)
    const resistances = allResistances
      .filter((r) => r.price > currentPrice)
      .sort((a, b) => a.price - b.price) // Mais próximo primeiro
      .slice(0, 3)
      .map((r) => ({
        ...r,
        distance: `${(((r.price - currentPrice) / currentPrice) * 100).toFixed(1)}%`,
      }));

    // Se não encontrou níveis suficientes, adiciona mocks
    while (supports.length < 3) {
      const fallbackPrice = currentPrice * (0.96 - supports.length * 0.03);
      supports.push({
        price: fallbackPrice,
        distance: `${(((currentPrice - fallbackPrice) / currentPrice) * 100).toFixed(1)}%`,
        timeframe:
          supports.length === 0
            ? "Daily"
            : supports.length === 1
              ? "Weekly"
              : "HTF",
      });
    }

    while (resistances.length < 3) {
      const fallbackPrice = currentPrice * (1.04 + resistances.length * 0.03);
      resistances.push({
        price: fallbackPrice,
        distance: `${(((fallbackPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%`,
        timeframe:
          resistances.length === 0
            ? "Daily"
            : resistances.length === 1
              ? "Weekly"
              : "HTF",
      });
    }

    return { supports, resistances };
  } catch (error) {
    console.error("Failed to calculate key levels:", error);
    // Fallback completo para mocks em caso de erro
    return {
      supports: [
        { price: currentPrice * 0.96, distance: "4.0%", timeframe: "Daily" },
        { price: currentPrice * 0.93, distance: "7.0%", timeframe: "Weekly" },
        { price: currentPrice * 0.9, distance: "10.0%", timeframe: "HTF" },
      ],
      resistances: [
        { price: currentPrice * 1.04, distance: "4.0%", timeframe: "Daily" },
        { price: currentPrice * 1.07, distance: "7.0%", timeframe: "Weekly" },
        { price: currentPrice * 1.1, distance: "10.0%", timeframe: "HTF" },
      ],
    };
  }
}
