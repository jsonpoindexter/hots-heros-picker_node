export interface Session {
    players: Player[]
}
export enum Team {
    red,
    blue,
}

export interface Player {
    name: string
    team: Team
    selectedId: number | null // Hero index
    bannedIds: number[]
}
