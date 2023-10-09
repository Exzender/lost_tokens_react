import React from 'react'
import { useState } from 'react'
/* resources */
import backImg1 from './images/group-60-1-1@2x.png'
import backImg2 from './images/group-60-2-1@2x.png'
import icons3 from './images/icons-3@2x.png'
import icons4 from './images/icons-4@2x.png'
import icons5 from './images/icons-5@2x.png'
import './App.css'
/* local imports */
import { tokens, contracts } from './const'
import { Blockchain }  from "./web3";
import { numberWithCommas } from "./utils";
/* globals */
const CHAIN = 'eth' // eth or bsc or polygon
const web3 = new Blockchain(CHAIN)
const timeoutMap: Map<string,  NodeJS.Timeout> = new Map()
type FormattedResult = { resStr: string, asDollar: number }

function parseAddress(address: string): string {
  let result: string[] = [];
  const list = address.split(/\n|;|,|;\n|,\n/)

  for (const l of list) {
    const name = l.trim()
    if (web3.checkEthAddress(name)) {
      result.push(name)
    }
    // TODO list and show invalid (excluded) addresses to user
  }

  // dedupe
  result = Array.from(new Set(result))

  return result.join('\n')
}

function timeoutInput(setter: any, value: string, areaName: string, setButtonState: any) {
  setter(value)

  setButtonState(false)

  if (timeoutMap.has(areaName)) {
    clearTimeout(timeoutMap.get(areaName))
  }

  // Set up new one
  const timeoutId = setTimeout(function() {
    setter(parseAddress(value))
    setButtonState(true)
  }, 5000)
  timeoutMap.set(areaName, timeoutId);
}

function formatTokenResult(res: any): FormattedResult {
  let localStr = ''

  if (!res.ticker) { // invalid token
    return { resStr : `??? [${res.tokenAddress}] - unknown token\n`, asDollar: 0 }
  }

  if (res.price === -1) { // can't get price
    return { resStr : `${res.ticker} [${res.tokenAddress}]: not checked - no price found\n`, asDollar: 0 }
  }

  // normal process
  let sum = 0n

  // records already sorted by value - formatting output
  for (const record of res.records) {
    const str = `Contract ${record.contract} => ${numberWithCommas(record.roundedAmount)} ${res.ticker} ( $${record.dollarValue} )`
    sum += record.amount
    localStr += str + '\n'
  }

  // increasing sum value
  const roundedAmount = Number(sum) / Number(`1e${res.decimals}`)
  const asDollar = roundedAmount * res.price

  const header = `${res.ticker} [${res.tokenAddress}]: ${numberWithCommas(roundedAmount)} tokens lost / $${numberWithCommas(asDollar)}`
  localStr = header + '\n-----------------------------------------------\n' + localStr

  return { resStr: localStr, asDollar }
}

async function buttonClick(tokensList: string, contractsList: string, setResults: any, setResultSum: any,
                           setResultTokenNumber: any, setDateString: any, setButtonState: any) {

  setButtonState(false)

  // TODO disable text input while processing

  // exclude duplicates
  const chainContracts = contractsList.split('\n')
  const chainTokens = tokensList.split('\n')

  if (chainTokens[0] === '') {
    setButtonState(true)
    return
  }

  if (chainContracts[0] === '') {
    chainContracts[0] = chainTokens[0]
  }
  const contractListArray = Array.from(new Set(chainContracts.concat(chainTokens)))

  const resultsArray: any[] = []
  let wholeSum = 0
  let resStr = ''
  let counter = 0

  for (const tokenAddress of chainTokens) {
    const res = await web3.processOneToken(contractListArray, tokenAddress)

    const formatted: FormattedResult = formatTokenResult(res)
    resStr += formatted.resStr + '\n'

    wholeSum += formatted.asDollar
    resultsArray.push({
      ...res,
      asDollar: formatted.asDollar
    })

    setResults(resStr)
    setResultSum(`$${numberWithCommas(wholeSum)}`)
    setResultTokenNumber(++counter)
  }

  setDateString(new Date().toDateString())

  resultsArray.sort(function (a, b) {
    return b.asDollar - a.asDollar
  })

  resStr = '';
  for (const res of resultsArray) {
    const formatted = formatTokenResult(res)
    resStr += formatted.resStr + '\n'
    setResults(resStr)
  }

  setButtonState(true)
}


function App() {
  const contractsStr = contracts[CHAIN].join('\n')
  const tokensStr = tokens[CHAIN].join('\n')

  const [contractsList, setContractcs] = useState(contractsStr)
  const [tokensList, setTokens] = useState(tokensStr)
  const [resultsList, setResults] = useState('')
  const [resultSum, setResultSum] = useState('$ 00.00')
  const [resultTokenNumber, setResultTokenNumber] = useState(0)
  const [dateString, setDateString] = useState(new Date().toDateString())
  const [buttonEnabled, setButtonState] = useState(true)

  return (
      <div className="container">
        <header className="header">
          <div className="header-images-container">
            <img className="img-head-1" alt="Group" src={backImg1} />
            <img className="img-head-2" alt="Group" src={backImg2} />
          </div>
          <div className="text-overlay">
            <p className="erc-text-p">
              <span>Losses calculator</span>
            </p>
            <p className="security-text-p">
              <span>Upgrade to ERC-223: The key to minimizing financial losses</span>
            </p>
            <p className="ERC-is-a-token">
                <span>
                  Stop losing money due to ERC-20! Make the smart switch to ERC-223 now. Our cutting-edge platform
                  calculates your financial losses caused by using ERC-20 tokens instead of ERC-223. Don&#39t let
                  outdated standards hold you back – upgrade today and secure your financial future.
                </span>
            </p>
          </div>
        </header>

        <main className="main-content">
          <section className="search-section">
            <p className="search-section-wrapper">
              <span>Search for losses</span>
            </p>
            <div className="group-3">
              <div className="textarea-container">
                <p className="wallet-address">
                  <label>Token addresses</label>
                </p>
                <textarea
                    className="textarea-list"
                    value={tokensList}
                    onChange={(event) => timeoutInput(setTokens, event.target.value,
                        'tokensList', setButtonState)}
                ></textarea>
              </div>
              <div className="textarea-container">
                <p className="wallet-address">
                  <label>Contracts to check</label>
                </p>
                <textarea
                    className="textarea-list"
                    value={contractsList}
                    onChange={(event) => timeoutInput(setContractcs, event.target.value,
                        'contractsList', setButtonState)}
                ></textarea>
              </div>
            </div>
            <button className="search-button" disabled={!buttonEnabled} onClick={() => buttonClick(tokensList, contractsList, setResults,
                setResultSum, setResultTokenNumber, setDateString, setButtonState)}>
              Start search
            </button>
          {/*</section>*/}

          {/*<section className="result-section">*/}
            <div className="frame-6">
              <p className="search-section-wrapper">
                <span>Result</span>
              </p>
              <div className="frame-8">
                <div className="frame-9">
                  <img
                      className="icons-2"
                      alt="Icons"
                      src={icons3}
                  />
                  <p className="span-wrapper-2">
                    <span>Data recalculation: {dateString}</span>
                  </p>
                </div>
                <div className="frame-9">
                  <img
                      className="icons-2"
                      alt="Icons"
                      src={icons4}
                  />
                  <p className="span-wrapper-2">
                    <span>Calculated for {resultTokenNumber} tokens</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="frame-11">
              <div className="frame-12">
                <div className="frame-13">
                  <img
                      className="icons-3"
                      alt="Icons"
                      src={icons5}
                  />
                  <p className="total-lost-of-ERC">
                    <span>Total lost of ERC-20 tokens</span>
                  </p>
                </div>
                <p className="total-lost-text">
                  <span>{resultSum}</span>
                </p>
              </div>
            </div>

            <div className="frame-reuslts">
              <textarea
                  className="textarea-results"
                  value={resultsList}
              ></textarea>
            </div>

          </section>
        </main>

        <footer className="footer">
          {/* Footer content */}
          <p className="security-text-p">
            <span className="security-text-wrapper">-- footer --</span>
          </p>
        </footer>
      </div>
  )
}

export default App
