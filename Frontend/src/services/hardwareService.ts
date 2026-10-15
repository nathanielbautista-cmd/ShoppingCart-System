import api from './api';

export const setHardwareAlarm = async (active: boolean): Promise<void> => {
  await api.post('/hardware/alarm', { active });
};
