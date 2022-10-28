import { useCallback, useEffect, useState } from "react"
import { Section } from "../Section"
import { useApi } from "./useApi"
import { AccountData, AccountInfo } from "@polkadot/types/interfaces"
import { useWallet } from "./useWallet"
import { Button } from "talisman-ui"

const useBalancesPalletBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [value, setValue] = useState<AccountData>()

  const refresh = useCallback(() => {
    if (!api || !account) return () => {}

    setError(undefined)
    setValue(undefined)
    setIsLoading(true)
    api.query.balances
      .account<AccountData>(account.address)
      .then(setValue)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [account, api])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    accountData: value,
    error,
    isLoading,
    refresh,
  }
}

const DisplayBalancesPalletBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()
  const { isLoading, error, accountData, refresh } = useBalancesPalletBalance()

  if (!api || !account) return null

  return (
    <div className="space-y-8">
      <h3>Pallet : balances_account</h3>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-alert-error">{error.message}</div>}
      {accountData && <pre>{JSON.stringify(accountData.toHuman(), undefined, 2)}</pre>}
      <Button onClick={refresh}>Refresh</Button>
    </div>
  )
}

const useSystemPalletBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error>()
  const [value, setValue] = useState<AccountInfo>()

  const refresh = useCallback(() => {
    if (!api || !account) return () => {}

    setError(undefined)
    setValue(undefined)
    setIsLoading(true)
    api.query.system
      .account<AccountInfo>(account.address)
      .then(setValue)
      .catch(setError)
      .finally(() => setIsLoading(false))
  }, [account, api])

  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    accountData: value,
    error,
    isLoading,
    refresh,
  }
}

const DisplaySystemPalletBalance = () => {
  const { api } = useApi()
  const { account } = useWallet()
  const { isLoading, error, accountData, refresh } = useSystemPalletBalance()

  if (!api || !account) return null

  return (
    <div className="space-y-8">
      <h3>Pallet : system_account</h3>
      {isLoading && <div>Loading...</div>}
      {error && <div className="text-alert-error">{error.message}</div>}
      {accountData && <pre>{JSON.stringify(accountData.toHuman(), undefined, 2)}</pre>}
      <Button onClick={refresh}>Refresh</Button>
    </div>
  )
}

export const Balance = () => {
  const { api } = useApi()
  const { account } = useWallet()

  if (!api || !account) return null

  return (
    <Section title="Balance">
      <div className="grid grid-cols-2 gap-8">
        <DisplayBalancesPalletBalance />
        <DisplaySystemPalletBalance />
      </div>
    </Section>
  )
}