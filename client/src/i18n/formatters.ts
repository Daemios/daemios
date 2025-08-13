import type { WorldLocationType } from '@shared/types/enums';
import { WorldLocationTypes } from '@shared/types/enums';
import { useI18n } from 'vue-i18n';

export function useFormatters() {
  const { t } = useI18n();

  function locationTypeLabel(type: WorldLocationType): string {
    return t(`locationType.${type}`);
  }

  function locationTypeOptions(): Array<{ value: WorldLocationType; label: string }> {
    return WorldLocationTypes.map(v => ({ value: v, label: t(`locationType.${v}`) }));
  }

  return { locationTypeLabel, locationTypeOptions };
}
