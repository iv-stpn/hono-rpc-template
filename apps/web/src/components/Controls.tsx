// Top-right controls: a theme switcher (light/dark) and a language switcher.
// Both reflect persisted state — the theme via the theme store, the language
// via i18next's own localStorage detection — so choices survive reloads.
import { Check, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Language, supportedLngs } from "../i18n";
import { type Theme, useThemeStore } from "../store/themeStore";

function ThemeToggle() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const isDark = theme === "dark";

  const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
    { value: "light", label: t("common.theme.light"), icon: Sun },
    { value: "dark", label: t("common.theme.dark"), icon: Moon },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="icon"
          aria-label={isDark ? t("common.theme.toLight") : t("common.theme.toDark")}
          className="text-muted hover:bg-accent/10 hover:text-accent"
        >
          {isDark ? <Moon className="size-4" aria-hidden="true" /> : <Sun className="size-4" aria-hidden="true" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onSelect={() => setTheme(value)}>
            <Icon className="size-4" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {theme === value && <Check className="size-4 text-accent" aria-hidden="true" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LanguageSwitch() {
  const { t, i18n } = useTranslation();
  const current = (
    supportedLngs.includes(i18n.resolvedLanguage as Language) ? i18n.resolvedLanguage : "en"
  ) as Language;

  return (
    <Select value={current} onValueChange={(value) => i18n.changeLanguage(value)}>
      <SelectTrigger aria-label={t("common.language.label")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {supportedLngs.map((lng) => (
          <SelectItem key={lng} value={lng}>
            {t(`common.language.${lng}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Fixed cluster shown on every page so theme/language are always reachable.
export function Controls() {
  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-1.5">
      <LanguageSwitch />
      <ThemeToggle />
    </div>
  );
}
