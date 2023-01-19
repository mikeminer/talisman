import { BalanceFormatter } from "@talismn/balances"
import useToken from "@ui/hooks/useToken"
import { useTokenRates } from "@ui/hooks/useTokenRates"
import { FC, useMemo } from "react"

import Fiat from "./Fiat"
import Tokens from "./Tokens"

type TokensAndFiatProps = {
  planck?: string | bigint
  tokenId?: string
  className?: string
  as?: "span" | "div"
  noTooltip?: boolean
  noCountUp?: boolean
  isBalance?: boolean
  noFiat?: boolean
}

export const TokensAndFiat: FC<TokensAndFiatProps> = ({
  planck,
  tokenId,
  className,
  noTooltip,
  noCountUp,
  isBalance,
  noFiat,
}) => {
  const token = useToken(tokenId)
  const tokenRates = useTokenRates(tokenId)

  const balance = useMemo(
    () =>
      token && tokenRates && planck !== undefined
        ? new BalanceFormatter(planck, token.decimals, tokenRates)
        : null,
    [planck, token, tokenRates]
  )

  if (!balance || !token) return null

  return (
    <span className={className}>
      <Tokens
        amount={balance.tokens}
        decimals={token.decimals}
        symbol={token.symbol}
        noCountUp={noCountUp}
        noTooltip={noTooltip}
        isBalance={isBalance}
      />
      {tokenRates && !noFiat ? (
        <>
          {" "}
          (
          <Fiat
            amount={balance.fiat("usd")}
            currency="usd"
            isBalance={isBalance}
            noCountUp={noCountUp}
          />
          )
        </>
      ) : null}
    </span>
  )
}