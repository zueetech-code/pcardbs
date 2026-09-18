/* =========================================================
   COMMON TRIGGER FUNCTION (CREATE ONCE)
   ========================================================= */
CREATE OR REPLACE FUNCTION update_modified_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* =========================================================
   MEMBERS
   ========================================================= */
CREATE TABLE IF NOT EXISTS members (
    sds_code            VARCHAR(10) NOT NULL,
    date                DATE NOT NULL,
    schm_code           VARCHAR(10) NOT NULL,
    branch_name         VARCHAR(100),
    scheme_description  VARCHAR(200),
    upto_month_count    INTEGER,
    upto_month_balance  NUMERIC(15,2),
    receipt_count       INTEGER,
    receipt_amt         NUMERIC(15,2),
    payment_count       INTEGER,
    payment_amt         NUMERIC(15,2),
    close_count         INTEGER,
    close_amt           NUMERIC(15,2),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT members_pk PRIMARY KEY (sds_code, date, schm_code)
);

CREATE TRIGGER trg_members_modified
BEFORE UPDATE ON members
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   DEPOSITS
   ========================================================= */
CREATE TABLE IF NOT EXISTS deposits (
    sds_code            VARCHAR(10) NOT NULL,
    date                DATE NOT NULL,
    schm_code           VARCHAR(10) NOT NULL,
    branch_name         VARCHAR(100),
    scheme_description  VARCHAR(200),
    upto_month_count    INTEGER,
    upto_month_balance  NUMERIC(15,2),
    receipt_count       INTEGER,
    receipt_amt         NUMERIC(15,2),
    payment_count       INTEGER,
    payment_amt         NUMERIC(15,2),
    close_count         INTEGER,
    close_amt           NUMERIC(15,2),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT deposits_pk PRIMARY KEY (sds_code, date, schm_code)
);

CREATE TRIGGER trg_deposits_modified
BEFORE UPDATE ON deposits
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   LOANS (SAME AS DEPOSITS)
   ========================================================= */
CREATE TABLE IF NOT EXISTS loans (
    sds_code            VARCHAR(10) NOT NULL,
    date                DATE NOT NULL,
    schm_code           VARCHAR(10) NOT NULL,
    branch_name         VARCHAR(100),
    scheme_description  VARCHAR(200),
    upto_month_count    INTEGER,
    upto_month_balance  NUMERIC(15,2),
    receipt_count       INTEGER,
    receipt_amt         NUMERIC(15,2),
    payment_count       INTEGER,
    payment_amt         NUMERIC(15,2),
    close_count         INTEGER,
    close_amt           NUMERIC(15,2),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT loans_pk PRIMARY KEY (sds_code, date, schm_code)
);

CREATE TRIGGER trg_loans_modified
BEFORE UPDATE ON loans
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   JEWEL DETAILS
   ========================================================= */
CREATE TABLE IF NOT EXISTS jewel_details (
    sds_code                VARCHAR(10) NOT NULL,
    date                    DATE NOT NULL,
    branch_name             VARCHAR(100),
    no_of_loans             INTEGER,
    gross_weight_grams      NUMERIC(12,2),
    net_weight_grams        NUMERIC(12,2),
    market_value_crores     NUMERIC(10,2),
    net_market_value_crores NUMERIC(10,2),
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT jewel_details_pk PRIMARY KEY (sds_code, date)
);

CREATE TRIGGER trg_jewel_modified
BEFORE UPDATE ON jewel_details
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   BRANCH DETAILS
   ========================================================= */
CREATE TABLE IF NOT EXISTS branch_details (
    sdscode        VARCHAR(10) NOT NULL,
    branchname     VARCHAR(150) NOT NULL,
    numberofbranch INTEGER,
    district       VARCHAR(100),
    state          VARCHAR(100),
    regionname     VARCHAR(100),
    circlename     VARCHAR(100),
    block          VARCHAR(100),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT branch_details_pk PRIMARY KEY (sdscode)
);

CREATE TRIGGER trg_branch_modified
BEFORE UPDATE ON branch_details
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   NPA DETAILS
   ========================================================= */
CREATE TABLE IF NOT EXISTS npa_details (
    sds_code                  VARCHAR(10) NOT NULL,
    date                      DATE NOT NULL,
    gnpa_amount               NUMERIC(15,2),
    gnpa_percent              NUMERIC(6,2),
    nnpa_amount               NUMERIC(15,2),
    nnpa_percent              NUMERIC(6,2),
    provision_percent         NUMERIC(6,2),
    total_overdue_count       INTEGER,
    total_overdue_amount      NUMERIC(15,2),
    no_action_taken_count     INTEGER,
    no_action_taken_amount    NUMERIC(15,2),
    registered_notices_count  INTEGER,
    registered_notices_amount NUMERIC(15,2),
    arc_count                 INTEGER,
    arc_amount                NUMERIC(15,2),
    decree_count              INTEGER,
    decree_amount             NUMERIC(15,2),
    ep_count                  INTEGER,
    ep_amount                 NUMERIC(15,2),
    created_at                TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT npa_details_pk PRIMARY KEY (sds_code, date)
);

CREATE TRIGGER trg_npa_modified
BEFORE UPDATE ON npa_details
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   PROFIT DETAILS
   ========================================================= */
CREATE TABLE IF NOT EXISTS profit_details (
    sds_code                             VARCHAR(10) NOT NULL,
    date                                 DATE NOT NULL,
    cd_ratio                             NUMERIC(6,2),
    other_income                         NUMERIC(15,2),
    expenditure                          NUMERIC(15,2),
    audit_completed_year                VARCHAR(9),
    net_profit                           NUMERIC(15,2),
    current_profit_with_cumulative_loss NUMERIC(15,2),
    current_loss_with_accumulated_loss  NUMERIC(15,2),
    created_at                           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at                          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT profit_details_pk PRIMARY KEY (sds_code, date)
);

CREATE TRIGGER trg_profit_modified
BEFORE UPDATE ON profit_details
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   EMPLOYEE DETAILS
   ========================================================= */
CREATE TABLE IF NOT EXISTS employee_details (
    sds_code                VARCHAR(10) NOT NULL,
    date                    DATE NOT NULL,
    approved_cadre_strength INTEGER,
    filled                  INTEGER,
    vacant                  INTEGER,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at             TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT employee_details_pk PRIMARY KEY (sds_code, date)
);

CREATE TRIGGER trg_employee_modified
BEFORE UPDATE ON employee_details
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

/* =========================================================
   SAFETY DETAILS
   ========================================================= */
CREATE TABLE IF NOT EXISTS safety_details (
    sds_code        VARCHAR(10) NOT NULL,
    date            DATE NOT NULL,
    safety_locker   BOOLEAN,
    defender_door   BOOLEAN,
    burglary_alarm  BOOLEAN,
    cctv            BOOLEAN,
    sms_alert       BOOLEAN,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT safety_details_pk PRIMARY KEY (sds_code, date)
);

CREATE TRIGGER trg_safety_modified
BEFORE UPDATE ON safety_details
FOR EACH ROW EXECUTE FUNCTION update_modified_at();

CREATE TABLE IF NOT EXISTS report_insert_log (
    id              BIGSERIAL PRIMARY KEY,

    client_name     VARCHAR(200) NOT NULL,
    sds_code        VARCHAR(10) NOT NULL,
    report_date     DATE NOT NULL,
    branch_name     VARCHAR(150),

    branch_inserted     BOOLEAN,
    members_inserted    BOOLEAN,
    deposits_inserted   BOOLEAN,
    loans_inserted      BOOLEAN,
    jewel_inserted      BOOLEAN,
    employee_inserted   BOOLEAN,
    npa_inserted        BOOLEAN,
    profit_inserted     BOOLEAN,
    safety_inserted     BOOLEAN,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_report_log
ON report_insert_log (client_name, sds_code, report_date);
ALTER TABLE report_insert_log
ADD COLUMN submission_type VARCHAR(20) DEFAULT 'FIRST';

ALTER TABLE report_insert_log
ADD CONSTRAINT unique_sds_date
UNIQUE (sds_code, report_date);


CREATE TABLE IF NOT EXISTS push_logs (
    id              BIGSERIAL PRIMARY KEY,

    source          VARCHAR(20) NOT NULL,     -- FIREBASE | POSTGRES
    client_name     VARCHAR(200) NOT NULL,
    from_date       DATE NOT NULL,
    module          VARCHAR(50) NOT NULL,     -- DEPOSIT/LOAN/MEMBER | JEWEL

    status          VARCHAR(10) NOT NULL,     -- SUCCESS | FAILED | DRY_RUN
    response        JSONB,

    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 🔐 prevent duplicate module logs per date
CREATE UNIQUE INDEX IF NOT EXISTS push_logs_unique
ON push_logs (source, client_name, from_date, module);