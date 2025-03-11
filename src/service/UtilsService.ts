import moment from 'moment'
import {PaymentMethod} from "@/types/Invoice.ts";
import {TranslationService} from "@/service/TranslationService.ts";
import {CustomerType} from "@/types/Customer.ts";

export const UtilsService = {
    formatCurrency(value: number | undefined) {
        // console.log("FORMAT_CURRENCY: ", value);
        if (value !== undefined && !Number.isNaN(value))
            return value.toLocaleString('pl-PL', {
                style: 'currency',
                currency: 'PLN',
            })
    },

    formatDateToString(value: Date | string | undefined): string {
        if (value) {
            const date = moment(value).format('YYYY-MM-DD')
            return date === '0001-01-01' ? '' : date
        }
        return ''
    },

    formatDate(value: Date | string | undefined): Date | undefined {
        if (value) {
            const date = moment(value).format('YYYY-MM-DD')
            return date === '0001-01-01' ? undefined : new Date(date)
        }
    },

    //zaznacza tekst po kliknięciu
    selectText(event: Event) {
        if (event.target && event.target instanceof HTMLInputElement) {
            event.target.select()
        }
    },

    findPatternInString(inputString: string, pattern: string, split: string) {
        // Dzielimy string na elementy według separatora ";;"
        const elements = inputString.split(split)

        // Filtrujemy elementy, które zawierają wzorzec (pattern)
        const matchedElements = elements.filter((element) => element.includes(pattern))

        return matchedElements
    },

    isPositiveInteger(value: string) {
        // console.log('isPositiveInteger',value)
        let str = String(value);
        if (!str) {
            return false;
        }
        str = str.replace(/^0+/, '') || '0';
        const n = Math.floor(Number(str));
        return n !== Infinity && String(n) === str && n >= 0;
    },

    isPositiveFloat(value: string): boolean {
        // console.log('isPositiveFloat', value);
        let str: string = String(value);
        str = str.trim();
        if (!str) {
            return false;
        }
        const num: number = Number(str);
        return !isNaN(num) && num > 0 && str === String(num);
    },

    mapVatToEnum(vat: { viewValue: string; numberValue: number; multiplier: number }): string {
        if (!vat) {
            return "VAT_0"; // Domyślna wartość, jeśli `vat` jest null lub undefined
        }

        if (vat.viewValue === "8%") return "VAT_8";
        if (vat.viewValue === "23%") return "VAT_23";

        // Dodaj inne mapowania w zależności od wymagań
        return "VAT_0"; // Domyślna wartość
    },

    getPaymentMethodsOption() {
        return Object.keys(PaymentMethod).map((key) => ({
            label: TranslationService.translateEnum("PaymentMethod", key), // klucz
            value: PaymentMethod[key as keyof typeof PaymentMethod], // wartość
        }));
    },

    getCustomerTypeOption() {
        return Object.keys(CustomerType).map((key) => ({
            label: TranslationService.translateEnum("CustomerType", key), // klucz
            value: CustomerType[key as keyof typeof CustomerType], // wartość
        }));
    },

    getMonthLabel(count: number): string {
        if (count < 0) {
            throw new Error("Liczba miesięcy nie może być ujemna.");
        }

        const lastDigit = count % 10;
        const penultimateDigit = Math.floor((count % 100) / 10);//przedostatnia

        if (penultimateDigit === 1) {
            // Liczby 11-19
            return `${count} miesięcy`;
        }

        if (lastDigit === 1) {
            // Liczby zakończone na 1, ale nie na 11
            return `${count} miesiąc`;
        } else if (lastDigit >= 2 && lastDigit <= 4) {
            // Liczby zakończone na 2, 3, 4, ale nie na 12, 13, 14
            return `${count} miesiące`;
        }

        // Wszystkie inne przypadki (np. 0, 5-9)
        return `${count} miesięcy`;
    },

     hexToRgba (hex: string, alpha: number): string  {
        let r = 0, g = 0, b = 0;

        if (hex.startsWith("#")) {
            hex = hex.substring(1);
        }

        if (hex.length === 3) {
            r = parseInt(hex[0] + hex[0], 16);
            g = parseInt(hex[1] + hex[1], 16);
            b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
            r = parseInt(hex.substring(0, 2), 16);
            g = parseInt(hex.substring(2, 4), 16);
            b = parseInt(hex.substring(4, 6), 16);
        }

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
}
