import { MxRecord, resolveMx } from 'dns'

type Provider = { cut: RegExp, aliasOf?: string }
type Providers = { [key: string]: Provider }
type MxEntry = { match: RegExp, provider: Provider }

const PLUS_ONLY = /\+.*$/
const PLUS_AND_DOT = /\.|\+.*$/g

const providers: Providers = {
    'google.com': {
        cut: PLUS_AND_DOT,
    },
    'gmail.com': {
        cut: PLUS_AND_DOT,
    },
    'googlemail.com': {
        cut: PLUS_AND_DOT,
        aliasOf: 'gmail.com',
    },
    'hotmail.com': {
        cut: PLUS_ONLY,
    },
    'live.com': {
        cut: PLUS_AND_DOT,
    },
    'outlook.com': {
        cut: PLUS_ONLY,
    },
    'fastmail.com': {
        cut: PLUS_ONLY,
    },
    'fastmail.fm': {
        cut: PLUS_ONLY,
    },
}

const mxMap: MxEntry[] = [
    { match: /aspmx.*google.*\.com\.?$/, provider: providers['gmail.com'] },
    { match: /\.messagingengine\.com\.?$/, provider: providers['fastmail.com'] },
]

export async function normalizeEmail(eMail: string): Promise<string> {
    const email = eMail.toLowerCase()
    const emailParts = email.split(/@/)

    if (emailParts.length !== 2) {
        return eMail
    }

    let username = emailParts[0]
    let domain = emailParts[1]

    const provider = await getProvider(domain)
    if (provider != null) {
        username = username.replace(provider.cut, '')
        if (provider.aliasOf != null) {
            domain = provider.aliasOf
        }
    }
    return username + '@' + domain
}

async function getProvider(domain: string): Promise<Provider | undefined> {
    let prov = providers[domain]
    if (!prov) {
        const mx = await resolveMxAsync(domain)
        if (mx) {
            let mxProv
            for (let i = 0; i < mx.length; i++) {
                const entry = mxMap.find(entry => entry.match.test(mx[i].exchange))
                if (entry) {
                    mxProv = entry.provider
                    break
                }
            }
            if (mxProv) {
                prov = mxProv
            }
        }
    }
    return prov
}

async function resolveMxAsync(name: string): Promise<MxRecord[]> {
    return new Promise<MxRecord[]>((resolve, reject) => {
        resolveMx(name, (err, records) => {
            if (err) {
                reject(err)
            }
            resolve(records)
        })
    })
}
