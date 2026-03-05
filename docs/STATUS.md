███╗   ███╗██╗██████╗ ██╗
████╗ ████║██║██╔══██╗██║
██╔████╔██║██║██║  ██║██║
██║╚██╔╝██║██║██║  ██║██║
██║ ╚═╝ ██║██║██████╔╝███████╗
╚═╝     ╚═╝╚═╝╚═════╝ ╚══════╝
 █████╗  ██████╗ ███████╗███╗   ██╗████████╗    ██╗  ██╗██╗████████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ██║ ██╔╝██║╚══██╔══╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       █████╔╝ ██║   ██║
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██╔═██╗ ██║   ██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ██║  ██╗██║   ██║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝       ╚═╝  ╚═╝╚═╝   ╚═╝

₿  Bitcoin-Anchored EVM · Chain 15001 · staging · 2026-03

────────────────────────────────────────────────────────────
 TEMPLATES
────────────────────────────────────────────────────────────
[stable]  Social Guestbook          contracts: SocialGuestbook
          On-chain: VERIFIED ✅ (staging)
          0xA4D2CbAF027125a967E48e94b1Baa03363981b1c

[stable]  Blank Starter             contracts: (none — bring your own)
          On-chain: n/a

[exp]     ERC-20 Dashboard          contracts: ERC20Token
          On-chain: VERIFIED ✅ (staging)
          0xD3B3bF2e85c34DC70b3D98a02A49Bd97430292A3

[exp]     Staking Dashboard         contracts: StakingRewards · RewardToken
          On-chain: VERIFIED ✅ (staging)
          StakingRewards  0xb0F7979AfDC413FDd5Df17b1D205b3B92287F1c3
          RewardToken     0xc9c5ae3179FD2486D6Ce45B1c8cd88591117513a

────────────────────────────────────────────────────────────
 STATE FILES (source of truth)
────────────────────────────────────────────────────────────
  state/deployment-log.json   addresses + ABI + verification status
  state/demo-contracts.json   demo health (active / funded / rateSet)
  state/erc-compatibility.json  which EVM features are enabled

────────────────────────────────────────────────────────────
 SCAFFOLD SKILL
────────────────────────────────────────────────────────────
  Entry:  skills/scaffold-midl-dapp/SKILL.md
  Flow:   choose template → validate capabilities
          → derive slug → scaffold dapp + harness
