import { useState } from 'react';
import styles from './console.module.css';

export function Instructions() {
  const [open, setOpen] = useState(true);
  return (
    <div className={styles.instructionsCard}>
      <button
        className={styles.instructionsToggle}
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span>HOW THIS WORKS</span>
        <span className={styles.chevron}>{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className={styles.instructionsBody}>
          <p>
            One-table per etch-a-sketch. Write writes on the etch-a-sketch. Read OCRs the data. Drop... well give it a try.
          </p>
          <h4>SQL</h4>
          <pre>{`CREATE TABLE tables (NAME TEXT, MATERIAL TEXT, RATING INT);
INSERT INTO tables VALUES ('COFFEE', 'WOOD', 10);
INSERT INTO tables VALUES ('BED SIDE', 'METAL', 8);
INSERT INTO tables VALUES ('FOLDING', 'PLASTIC', 1000);
SELECT * FROM tables;
DROP TABLE tables;
FLIP TABLE tables;`}</pre>
          <p>
            Also: <code>DROP TABLE …</code>, <code>DELETE FROM …</code>,{' '}
            <code>SHOW TABLE</code>. Press <code>F</code> on the etch to flip
            without typing.
          </p>
          <h4>Notes</h4>
          <p>
            Up to 4 columns. 7 data rows. Values truncate to fit. Don't shake. 😬
          </p>
        </div>
      )}
    </div>
  );
}
