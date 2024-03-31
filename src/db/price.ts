import { z } from "@builder.io/qwik-city";

export const BtcUsdtPriveValidator = z.object({
  symbol: z.string(),
  price: z.string(),
});
export const getBtcUsdtPrice = async () => {
  return parseFloat(
    BtcUsdtPriveValidator.parse(
      await (
        await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT",
        )
      ).json(),
    ).price,
  );
};
