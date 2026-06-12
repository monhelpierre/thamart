const RATES: { states: string[]; rate: number; freeThreshold: number | null }[] = [
    { states: ["SP"], rate: 9.9, freeThreshold: 150 },
    { states: ["RJ", "ES", "MG"], rate: 12.9, freeThreshold: 180 },
    { states: ["PR", "SC", "RS"], rate: 14.9, freeThreshold: 180 },
    { states: ["GO", "DF", "MT", "MS"], rate: 16.9, freeThreshold: 200 },
    { states: ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"], rate: 18.9, freeThreshold: 220 },
    { states: ["PA", "AM", "RR", "AP", "AC", "RO", "TO"], rate: 22.9, freeThreshold: null },
];

const INTERNATIONAL_RATE = 45.0;

const DELIVERY_DAYS: { states: string[]; min: number; max: number }[] = [
    { states: ["SP"], min: 2, max: 4 },
    { states: ["RJ", "ES", "MG"], min: 3, max: 6 },
    { states: ["PR", "SC", "RS"], min: 4, max: 7 },
    { states: ["GO", "DF", "MT", "MS"], min: 5, max: 9 },
    { states: ["BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"], min: 7, max: 12 },
    { states: ["PA", "AM", "RR", "AP", "AC", "RO", "TO"], min: 10, max: 15 },
];

export function deliveryEstimate(state: string): { min: number; max: number } {
    const entry = DELIVERY_DAYS.find((r) => r.states.includes(state.toUpperCase()));
    return entry ?? { min: 12, max: 20 };
}

export function formatDeliveryRange(state: string, lang: string): string {
    const { min, max } = deliveryEstimate(state);
    const from = new Date();
    from.setDate(from.getDate() + min);
    const to = new Date();
    to.setDate(to.getDate() + max);
    const locale = lang === "pt" ? "pt-BR" : lang === "fr" ? "fr-FR" : "en-US";
    const fmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
    return `${fmt.format(from)} – ${fmt.format(to)}`;
}

export function shippingRate(state: string, subtotal: number): number {
    const entry = RATES.find((r) => r.states.includes(state.toUpperCase()));
    if (!entry) return INTERNATIONAL_RATE;
    if (entry.freeThreshold !== null && subtotal >= entry.freeThreshold) return 0;
    return entry.rate;
}

export interface CepResult {
    ok: true;
    cep: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
}

export interface CepError {
    ok: false;
    message: string;
}

export async function lookupCep(cep: string): Promise<CepResult | CepError> {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) return { ok: false, message: "CEP inválido" };
    try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        if (!res.ok) return { ok: false, message: "CEP não encontrado" };
        const data = await res.json();
        if (data.erro) return { ok: false, message: "CEP não encontrado" };
        return {
            ok: true,
            cep: data.cep,
            street: data.logradouro ?? "",
            neighborhood: data.bairro ?? "",
            city: data.localidade ?? "",
            state: data.uf ?? "",
        };
    } catch {
        return { ok: false, message: "Erro ao buscar CEP" };
    }
}
