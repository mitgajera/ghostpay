use anchor_lang::prelude::*;

declare_id!("8D7XXDCg838SX6tgK1Lb2oEaiPD5oa8VSczxbHX5iT6g");

/// GhostPay — On-chain payroll receipt program.
///
/// Records a public, privacy-preserving receipt for each payroll batch:
/// - WHO ran payroll (employer wallet) — public
/// - HOW MANY recipients — public count, no wallet addresses
/// - TOTAL USDC — public aggregate, no per-recipient breakdown
///
/// Individual amounts and recipient wallets are handled privately inside
/// the MagicBlock Private Ephemeral Rollup (TEE). Nothing here reveals
/// what each employee was paid.
#[program]
pub mod ghost_pay {
    use super::*;

    /// Called by the employer before running payroll.
    /// Creates an on-chain receipt: who, how many, total — but not who got what.
    pub fn initialize_batch(
        ctx: Context<InitializeBatch>,
        batch_id: u64,
        num_recipients: u8,
        total_usdc: u64, // in USDC lamports (6 decimals)
    ) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        batch.employer = ctx.accounts.employer.key();
        batch.batch_id = batch_id;
        batch.num_recipients = num_recipients;
        batch.total_usdc = total_usdc;
        batch.timestamp = Clock::get()?.unix_timestamp;
        batch.settled = false;
        msg!(
            "GhostPay batch {} initialized: {} recipients, {} USDC lamports",
            batch_id,
            num_recipients,
            total_usdc
        );
        Ok(())
    }

    /// Called after all private transfers complete inside the TEE.
    /// Marks the batch as settled — the public receipt is now final.
    pub fn finalize_batch(ctx: Context<FinalizeBatch>) -> Result<()> {
        let batch = &mut ctx.accounts.batch;
        require!(!batch.settled, PayrollError::AlreadySettled);
        batch.settled = true;
        msg!("GhostPay batch {} settled", batch.batch_id);
        Ok(())
    }
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(batch_id: u64)]
pub struct InitializeBatch<'info> {
    #[account(
        init,
        payer = employer,
        space = 8 + PayrollBatch::LEN,
        seeds = [b"batch", employer.key().as_ref(), &batch_id.to_le_bytes()],
        bump
    )]
    pub batch: Account<'info, PayrollBatch>,
    #[account(mut)]
    pub employer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeBatch<'info> {
    #[account(
        mut,
        seeds = [b"batch", batch.employer.as_ref(), &batch.batch_id.to_le_bytes()],
        bump,
        has_one = employer
    )]
    pub batch: Account<'info, PayrollBatch>,
    pub employer: Signer<'info>,
}

// ─── State ────────────────────────────────────────────────────────────────────

#[account]
pub struct PayrollBatch {
    pub employer: Pubkey,       // 32 — who ran payroll (public)
    pub batch_id: u64,          // 8  — unique ID
    pub num_recipients: u8,     // 1  — how many paid (no wallet addresses)
    pub total_usdc: u64,        // 8  — total in USDC lamports (no breakdown)
    pub timestamp: i64,         // 8  — unix timestamp
    pub settled: bool,          // 1  — finalized after TEE transfers complete
}

impl PayrollBatch {
    pub const LEN: usize = 32 + 8 + 1 + 8 + 8 + 1; // 58 bytes
}

// ─── Errors ───────────────────────────────────────────────────────────────────

#[error_code]
pub enum PayrollError {
    #[msg("Batch already settled")]
    AlreadySettled,
}
