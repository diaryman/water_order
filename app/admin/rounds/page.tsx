import { getRounds } from '@/app/actions'
import RoundManager from './RoundManager'

export const dynamic = 'force-dynamic'

export default async function RoundsPage() {
    const rounds = await getRounds()
    return <RoundManager initialRounds={rounds} />
}
