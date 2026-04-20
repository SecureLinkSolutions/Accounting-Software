import { DEFAULT_LANGUAGE } from 'fyo/utils/consts';
import { systemLanguageRef } from './refs';

export async function setLanguageMap() {
  systemLanguageRef.value = DEFAULT_LANGUAGE;
}
