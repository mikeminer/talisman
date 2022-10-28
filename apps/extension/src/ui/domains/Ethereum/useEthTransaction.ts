import {
  getEip1559TotalFees,
  getGasLimit,
  getLegacyTotalFees,
  getMaxFeePerGas,
  prepareTransaction,
} from "@core/domains/ethereum/helpers"
import {
  EthGasSettings,
  EthGasSettingsEip1559,
  EthGasSettingsLegacy,
} from "@core/domains/ethereum/types"
import { EthPriorityOptionName, EthTransactionDetails } from "@core/domains/signing/types"
import { FeeHistoryAnalysis, getFeeHistoryAnalysis } from "@core/util/getFeeHistoryAnalysis"
import { api } from "@ui/api"
import { useEthereumProvider } from "@ui/domains/Ethereum/useEthereumProvider"
import { BigNumber, ethers } from "ethers"
import { useCallback, useEffect, useMemo, useState } from "react"

const useNonce = (address?: string, evmNetworkId?: number) => {
  const [nonce, setNonce] = useState<number>()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>()

  useEffect(() => {
    setIsLoading(true)
    setError(undefined)
    setNonce(undefined)

    if (address && evmNetworkId)
      api
        .ethGetTransactionsCount(address, evmNetworkId)
        .then(setNonce)
        .catch(() => setError("Failed to load nonce"))
        .finally(() => setIsLoading(false))
  }, [address, evmNetworkId])

  return { nonce, isLoading, error }
}

const useHasEip1559Support = (provider?: ethers.providers.JsonRpcProvider) => {
  // initialize with undefined, which is used to trigger the check
  const [hasEip1559Support, setHasEip1559Support] = useState<boolean>()
  const [isLoading, setIsLoading] = useState<boolean>()
  const [error, setError] = useState<string>()

  const checkEip1559Support = useCallback(async () => {
    setHasEip1559Support(undefined)

    if (!provider) return
    setIsLoading(true)
    setError(undefined)

    try {
      const { baseFeePerGas } = await provider.send("eth_getBlockByNumber", ["latest", false])
      setHasEip1559Support(baseFeePerGas !== undefined)
    } catch (err) {
      setError("Failed to load block data")
    }
    setIsLoading(false)
  }, [provider])

  useEffect(() => {
    // if provider changes, reset
    setHasEip1559Support(undefined)
  }, [provider])

  useEffect(() => {
    // if value is unknown, fetch it
    if (hasEip1559Support === undefined) checkEip1559Support()
  }, [checkEip1559Support, hasEip1559Support])

  return { hasEip1559Support, isLoading, error }
}

const useEstimatedGas = (
  provider?: ethers.providers.JsonRpcProvider,
  tx?: ethers.providers.TransactionRequest
) => {
  const [estimatedGas, setEstimatedGas] = useState<BigNumber>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLoading(false)
    setError(undefined)
    setEstimatedGas(undefined)

    if (!provider || !tx) return

    setIsLoading(true)
    provider
      .estimateGas(tx)
      .then(setEstimatedGas)
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))

    return () => {
      setError(undefined)
      setEstimatedGas(undefined)
      setIsLoading(false)
    }
  }, [provider, tx])

  return { estimatedGas, isLoading, error }
}

const useBlockFeeData = (provider?: ethers.providers.JsonRpcProvider, withFeeOptions?: boolean) => {
  const [gasPrice, setGasPrice] = useState<BigNumber | null>()
  const [baseFeePerGas, setBaseFeePerGas] = useState<BigNumber | null>()
  const [gasUsed, setGasUsed] = useState<BigNumber | null>()
  const [blockGasLimit, setBlockGasLimit] = useState<BigNumber | null>()
  const [feeHistoryAnalysis, setFeeHistoryAnalysis] = useState<FeeHistoryAnalysis | null>()
  const [error, setError] = useState<string>()
  const [isLoading, setIsLoading] = useState(false)

  // analyse fees on each block
  useEffect(() => {
    if (!provider) {
      setGasPrice(undefined)
      setBaseFeePerGas(undefined)
      setBlockGasLimit(undefined)
      setGasUsed(undefined)
      setFeeHistoryAnalysis(undefined)
      setError(undefined)
      return
    }

    const handleBlock = async () => {
      setIsLoading(true)
      try {
        const [gPrice, { gasLimit, baseFeePerGas, gasUsed }, feeOptions] = await Promise.all([
          provider.getGasPrice(),
          provider.getBlock("latest"),
          withFeeOptions ? getFeeHistoryAnalysis(provider) : undefined,
        ])

        if (feeOptions) {
          // `gasPrice - baseFee` is equal to the current minimum maxPriorityPerGas value required to make it into next block
          // if smaller than our historical data based value, use it.
          // this prevents paying to much fee based on historical data when other users are setting unnecessarily high fees on their transactions.
          const minimumMaxPriorityFeePerGas = BigNumber.from(gPrice).sub(baseFeePerGas ?? 0)
          if (minimumMaxPriorityFeePerGas.lt(feeOptions.options.low))
            feeOptions.options.low = minimumMaxPriorityFeePerGas
          if (minimumMaxPriorityFeePerGas.lt(feeOptions.options.medium))
            feeOptions.options.medium = minimumMaxPriorityFeePerGas
          if (minimumMaxPriorityFeePerGas.lt(feeOptions.options.high))
            feeOptions.options.high = minimumMaxPriorityFeePerGas
        }

        setGasPrice(gPrice)
        setBaseFeePerGas(baseFeePerGas)
        setBlockGasLimit(gasLimit)
        setGasUsed(gasUsed)
        setFeeHistoryAnalysis(feeOptions)
        setError(undefined)
      } catch (err) {
        setError((err as Error).message)
      }
      setIsLoading(false)
    }

    provider.on("block", handleBlock)

    //init
    handleBlock()

    return () => {
      provider.off("block", handleBlock)
    }
  }, [provider, withFeeOptions])

  const gasUsedRatio = useMemo(() => {
    if (!gasUsed || !blockGasLimit) return undefined
    return gasUsed.mul(100).div(blockGasLimit).toNumber() / 100
  }, [blockGasLimit, gasUsed])

  return {
    gasPrice,
    baseFeePerGas,
    gasUsed,
    gasUsedRatio,
    blockGasLimit,
    feeHistoryAnalysis,
    isLoading,
    error,
  }
}

export const useEthTransaction = (
  tx?: ethers.providers.TransactionRequest,
  defaultPriority: EthPriorityOptionName = "low",
  lockTransaction = false
) => {
  const provider = useEthereumProvider(tx?.chainId)
  const { hasEip1559Support, error: errorEip1559Support } = useHasEip1559Support(provider)
  const { nonce, error: nonceError } = useNonce(tx?.from, tx?.chainId)
  const { estimatedGas, error: estimatedGasError } = useEstimatedGas(provider, tx)

  const {
    gasPrice,
    gasUsedRatio,
    baseFeePerGas,
    blockGasLimit,
    feeHistoryAnalysis,
    error: blockFeeDataError,
  } = useBlockFeeData(provider, hasEip1559Support)

  const [priority, setPriority] = useState<EthPriorityOptionName>(defaultPriority)

  const gasSettings: EthGasSettings | undefined = useMemo(() => {
    if (hasEip1559Support === undefined || !estimatedGas || !gasPrice || !blockGasLimit)
      return undefined

    const gasLimit = getGasLimit(blockGasLimit, estimatedGas, tx?.gasLimit)

    if (hasEip1559Support) {
      if (!feeHistoryAnalysis || !baseFeePerGas) return undefined
      const maxPriorityFeePerGas = feeHistoryAnalysis.options[priority]
      return {
        type: 2,
        maxPriorityFeePerGas,
        maxFeePerGas: getMaxFeePerGas(baseFeePerGas, maxPriorityFeePerGas),
        gasLimit,
      } as EthGasSettingsEip1559
    }

    return {
      type: 0,
      gasPrice,
      gasLimit,
    } as EthGasSettingsLegacy
  }, [
    baseFeePerGas,
    blockGasLimit,
    estimatedGas,
    feeHistoryAnalysis,
    gasPrice,
    hasEip1559Support,
    priority,
    tx?.gasLimit,
  ])

  const liveUpdatingTransaction = useMemo(() => {
    if (!provider || !tx || !gasSettings || nonce === undefined) return undefined
    return prepareTransaction(tx, gasSettings, nonce)
  }, [gasSettings, provider, tx, nonce])

  // transaction may be locked once sent to hardware device for signing
  const [transaction, setTransaction] = useState(liveUpdatingTransaction)

  useEffect(() => {
    if (!lockTransaction) setTransaction(liveUpdatingTransaction)
  }, [liveUpdatingTransaction, lockTransaction])

  const txDetails: EthTransactionDetails | undefined = useMemo(() => {
    if (!gasPrice || !estimatedGas) return undefined

    const priorityOptions = feeHistoryAnalysis?.options
    // EIP1559 transactions
    if (
      transaction &&
      transaction.type === 2 &&
      transaction.maxPriorityFeePerGas &&
      gasPrice &&
      baseFeePerGas &&
      estimatedGas &&
      transaction?.gasLimit
    ) {
      const { estimatedFee, maxFee } = getEip1559TotalFees(
        estimatedGas,
        transaction.gasLimit,
        baseFeePerGas,
        transaction.maxPriorityFeePerGas
      )
      return {
        estimatedGas,
        gasPrice,
        baseFeePerGas,
        estimatedFee,
        maxFee,
        gasUsedRatio,
        priorityOptions,
      }
    }

    // Legacy transactions
    if (
      transaction &&
      transaction.type === 0 &&
      transaction.gasPrice &&
      transaction.gasLimit &&
      estimatedGas
    ) {
      const { estimatedFee, maxFee } = getLegacyTotalFees(
        estimatedGas,
        transaction.gasLimit,
        transaction.gasPrice
      )
      return {
        estimatedGas,
        gasPrice,
        baseFeePerGas: baseFeePerGas ?? undefined,
        estimatedFee,
        maxFee,
        gasUsedRatio,
        priorityOptions,
      }
    }

    return undefined
  }, [
    baseFeePerGas,
    estimatedGas,
    feeHistoryAnalysis?.options,
    gasPrice,
    gasUsedRatio,
    transaction,
  ])

  const error = useMemo(
    () => errorEip1559Support ?? estimatedGasError ?? blockFeeDataError ?? nonceError,
    [blockFeeDataError, errorEip1559Support, estimatedGasError, nonceError]
  )

  const isLoading = useMemo(() => tx && !txDetails && !error, [error, txDetails, tx])

  const result = useMemo(
    () => ({
      transaction,
      txDetails,
      gasSettings,
      priority,
      setPriority,
      isLoading,
      error,
    }),
    [transaction, txDetails, gasSettings, priority, isLoading, error]
  )

  return result
}