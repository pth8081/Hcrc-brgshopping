# MySQL → MSSQL type mapping cheat sheet

Use this when adapting `scripts/migrate-mysql-to-mssql.js` and the migrations
in `src/migrations/` to the real old schema.

| MySQL type              | MSSQL equivalent        | Notes |
|--------------------------|--------------------------|-------|
| `INT AUTO_INCREMENT`     | `INT IDENTITY(1,1)`      | Sequelize: `autoIncrement: true` |
| `BIGINT AUTO_INCREMENT`  | `BIGINT IDENTITY(1,1)`   | |
| `TINYINT(1)`             | `BIT`                    | Treat as boolean; MySQL driver returns 0/1 |
| `VARCHAR(n)`             | `NVARCHAR(n)`            | Use NVARCHAR to keep Vietnamese diacritics safe |
| `TEXT` / `LONGTEXT`      | `NVARCHAR(MAX)`          | |
| `DATETIME` / `TIMESTAMP` | `DATETIME2`              | Avoid old `DATETIME` (lower precision) |
| `DECIMAL(m,d)`           | `DECIMAL(m,d)`           | Same, but `mysql2` returns decimals as strings — cast with `Number()` |
| `DOUBLE` / `FLOAT`       | `FLOAT`                  | |
| `ENUM('a','b')`          | `NVARCHAR(20)` + `CHECK` | MSSQL has no native ENUM; Sequelize models already use STRING + `validate: { isIn: [...] } ` |
| `JSON`                   | `NVARCHAR(MAX)`          | Store as JSON text, or use SQL Server's native `JSON` functions in queries |
| `BOOLEAN`                | `BIT`                    | Alias of TINYINT(1) in MySQL |
| Autoincrement PK reused as FK elsewhere | same INT/BIGINT | Preserve original ids on migration using `SET IDENTITY_INSERT <table> ON/OFF` (already handled in the migration script) so relationships don't break |

## Key differences to watch for

- **Identifiers/quoting**: MySQL uses backticks (`` `col` ``); MSSQL uses
  square brackets (`[col]`) or none via Sequelize.
- **Auto-updating timestamps**: MySQL's `ON UPDATE CURRENT_TIMESTAMP` has no
  direct MSSQL equivalent — Sequelize's `timestamps: true` (already enabled)
  handles `updatedAt` at the application layer instead.
- **Case sensitivity**: MSSQL collations are usually case-insensitive by
  default for comparisons, unlike MySQL depending on collation — re-check any
  logic that relies on case-sensitive matching (e.g. slugs, emails should be
  lowercased before compare/insert).
- **LIMIT/OFFSET**: MySQL `LIMIT x OFFSET y` vs MSSQL
  `OFFSET y ROWS FETCH NEXT x ROWS ONLY` — only relevant if you hand-write raw
  SQL against MSSQL; Sequelize abstracts this already.
- **String concatenation**: MySQL `CONCAT()` vs MSSQL `+` or `CONCAT()`
  (SQL Server 2012+ also supports `CONCAT()`).
