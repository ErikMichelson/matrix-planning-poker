import { useEffect, useState } from 'react';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';

export function useSubject<T>(
  subject: BehaviorSubject<T>,
): T {
  const [value, setValue] = useState(subject.getValue());

  useEffect(() => {
    const subscription = subject
      .pipe(distinctUntilChanged())
      .subscribe((v) => {
        setValue(v);
      });

    return () => subscription.unsubscribe();
  }, [subject]);

  return value;
}
