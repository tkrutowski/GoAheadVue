
export const Translations: Record<string, Record<string, string>> = {
    PaymentMethod: {CASH: "gotówka", CASH_LATE: "gotówka terminowa", TRANSFER: "przelew"},
    CustomerStatus: {ACTIVE: "Aktywny", INACTIVE: "Nieaktywny"},
    CustomerType: {CUSTOMER: "Klient indywidualny", COMPANY: "Firma"},

    PaymentStatus: {
        PAID: "Zapłacona",
        TO_PAY: "Do zapłaty",
        OVER_DUE: "Przeterminowana",
        ALL: "ALL"
    }
};

export const TranslationService = {
    translateEnum(enumName: string, key: string): string {
        console.log("translateEnum ENUM, key",enumName,key, Translations[enumName]?.[key] || key)
        return Translations[enumName]?.[key] || key;
    }
}
