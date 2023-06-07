import { BigNumber } from "ethers"
import { FC, useMemo } from "react"

import { SignContainer } from "../../SignContainer"
import { SignViewIconHeader } from "../../Views/SignViewIconHeader"
import { SignViewStakingStakeLess } from "../../Views/staking/SignViewStakingStakeLess"
import { getContractCallArg } from "../getContractCallArg"
import { useEthSignKnownTransactionRequest } from "../shared/useEthSignKnownTransactionRequest"

export const EthSignMoonStakingStakeLess: FC = () => {
  const { network, transactionInfo } = useEthSignKnownTransactionRequest()

  const less = useMemo(
    () => getContractCallArg<BigNumber>(transactionInfo.contractCall, "less")?.toBigInt(),
    [transactionInfo.contractCall]
  )

  if (!network?.nativeToken?.id || !less) return null

  return (
    <SignContainer
      networkType="ethereum"
      title="Decrease stake"
      header={<SignViewIconHeader icon="unstake" />}
    >
      <SignViewStakingStakeLess planck={less} tokenId={network.nativeToken.id} />
    </SignContainer>
  )
}