export interface Session {
    players: Player[]
}
export enum Team {
    red,
    blue,
}

export interface Player {
    id: string
    name: string
    team: Team
    selectedId: number | null // Hero index
    bannedIds: number[]
}
