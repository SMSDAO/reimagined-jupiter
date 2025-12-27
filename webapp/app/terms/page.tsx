"use client";

import { motion } from "framer-motion";

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Terms of Service
        </h1>
        <p className="text-gray-400 mb-8">Last Updated: October 30, 2025</p>

        <div className="bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              1. Acceptance of Terms
            </h2>
            <p className="text-gray-300 dark:text-gray-200 mb-4">
              By accessing and using GXQ Studio platform (&quot;Service&quot;),
              you accept and agree to be bound by the terms and provision of
              this agreement. If you do not agree to these terms, please do not
              use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              2. Use of Service
            </h2>
            <div className="text-gray-300 dark:text-gray-200 space-y-3">
              <p>GXQ Studio provides the following services:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Flash loan arbitrage trading platform</li>
                <li>Token swap aggregation via Jupiter and other DEXs</li>
                <li>Token launchpad with airdrop distribution</li>
                <li>Sniper bot for new token launches</li>
                <li>Staking and lending integrations</li>
                <li>API access for developers</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              3. Fees and Payments
            </h2>
            <div className="text-gray-300 dark:text-gray-200 space-y-3">
              <p>
                By using GXQ Studio, you agree to the following fee structure:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>10% platform fee on profitable arbitrage trades</li>
                <li>0.01 SOL token deployment fee for launchpad</li>
                <li>Standard network fees apply to all transactions</li>
                <li>Additional fees may apply for premium API access</li>
              </ul>
              <p className="mt-4">
                All fees are automatically deducted and sent to the developer
                wallet:{" "}
                <code className="bg-purple-900/50 px-2 py-1 rounded">
                  monads.solana
                </code>
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              4. Risk Disclosure
            </h2>
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-6">
              <h3 className="text-yellow-400 font-bold mb-3">
                ⚠️ Important Risk Information
              </h3>
              <div className="text-gray-300 dark:text-gray-200 space-y-2">
                <p>Cryptocurrency trading carries significant risk:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>
                    Trading cryptocurrencies is highly speculative and risky
                  </li>
                  <li>You may lose all invested capital</li>
                  <li>Flash loan arbitrage involves complex DeFi strategies</li>
                  <li>Smart contracts may contain bugs or vulnerabilities</li>
                  <li>Market volatility can result in significant losses</li>
                  <li>Past performance does not guarantee future results</li>
                </ul>
                <p className="mt-4 font-bold">
                  Only invest what you can afford to lose. GXQ Studio is not
                  responsible for trading losses.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              5. No Financial Advice
            </h2>
            <p className="text-gray-300 dark:text-gray-200">
              GXQ Studio does not provide investment, financial, trading, or
              other advice. All content is provided for informational purposes
              only. You should conduct your own research and consult with
              qualified professionals before making any investment decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              6. Wallet Security
            </h2>
            <div className="text-gray-300 dark:text-gray-200 space-y-3">
              <p>You are responsible for:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>
                  Maintaining the security of your wallet and private keys
                </li>
                <li>All transactions made from your wallet</li>
                <li>Verifying all transaction details before confirmation</li>
                <li>Protecting your account credentials</li>
              </ul>
              <p className="mt-4">
                GXQ Studio never asks for your private keys or seed phrases.
                Never share this information with anyone.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. API Usage</h2>
            <div className="text-gray-300 dark:text-gray-200 space-y-3">
              <p>API users must:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Register for an API key</li>
                <li>Comply with rate limits and usage guidelines</li>
                <li>Not abuse or overload the API</li>
                <li>Not use the API for illegal activities</li>
                <li>Maintain the confidentiality of API credentials</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              8. Affiliate Program
            </h2>
            <p className="text-gray-300 dark:text-gray-200">
              GXQ Studio offers an affiliate program where participants can earn
              GXQ tokens. Affiliate terms are subject to separate agreements and
              may be modified at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              9. Prohibited Activities
            </h2>
            <div className="text-gray-300 dark:text-gray-200 space-y-3">
              <p>You may not:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the Service for any illegal purpose</li>
                <li>Attempt to manipulate markets or prices</li>
                <li>Engage in wash trading or fraudulent activity</li>
                <li>Reverse engineer or exploit the platform</li>
                <li>Use bots or automation without authorization</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-gray-300 dark:text-gray-200">
              GXQ Studio and its developers shall not be liable for any direct,
              indirect, incidental, special, or consequential damages resulting
              from your use of the Service, including but not limited to loss of
              funds, data, or profits.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              11. Modifications to Terms
            </h2>
            <p className="text-gray-300 dark:text-gray-200">
              We reserve the right to modify these terms at any time. Continued
              use of the Service after changes constitutes acceptance of the
              modified terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">
              12. Contact Information
            </h2>
            <div className="bg-purple-900/30 dark:bg-purple-950/50 rounded-lg p-6">
              <p className="text-gray-300 dark:text-gray-200 mb-2">
                For questions about these Terms of Service:
              </p>
              <p className="text-white font-mono">
                Developer Wallet: monads.solana
              </p>
              <p className="text-white">Platform: GXQ Studio</p>
              <p className="text-gray-400 text-sm mt-4">
                Deployed on Vercel: https://jup-nine.vercel.app/
              </p>
            </div>
          </section>

          <div className="border-t border-purple-500/30 pt-6 mt-8">
            <p className="text-center text-gray-400 text-sm">
              By using GXQ Studio, you acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
