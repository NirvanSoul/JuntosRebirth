import type { RemoteImportReview } from '@/features/import/gateways/juntossImportReviewGateway';
import type { RestoredRemoteAccount } from '@/features/sync/services/restoreRemoteAccount';
import { getLocalDatabase } from '@/lib/storage/localDatabase';

export async function restoreRemoteImportReviews(input: {
  reviews: readonly RemoteImportReview[];
  restored: RestoredRemoteAccount;
}): Promise<void> {
  const database = await getLocalDatabase();
  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const review of input.reviews) {
      const spaceId = input.restored.localSpaceIdByRemoteId.get(
        review.spaceRemoteId,
      );
      if (!spaceId) continue;
      await transaction.runAsync(
        `INSERT INTO import_batches (
           id, space_id, source_type, status, total_items, review_items,
           duplicate_items, sync_status, created_at, updated_at, completed_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'synced', ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           status = excluded.status, total_items = excluded.total_items,
           review_items = excluded.review_items,
           duplicate_items = excluded.duplicate_items,
           updated_at = excluded.updated_at, completed_at = excluded.completed_at
         WHERE import_batches.sync_status = 'synced'`,
        review.id,
        spaceId,
        review.sourceType,
        review.status,
        review.totalItems,
        review.reviewItems,
        review.duplicateItems,
        review.createdAt,
        review.updatedAt,
        review.completedAt,
      );
      for (const item of review.items) {
        const categoryId = item.categoryRemoteId
          ? (input.restored.localCategoryIdByRemoteId.get(
              item.categoryRemoteId,
            ) ?? null)
          : null;
        await transaction.runAsync(
          `INSERT INTO import_items (
             id, batch_id, space_id, source_row, raw_description,
             normalized_merchant, occurred_on, amount_minor, currency,
             movement_type, suggested_category_id, final_category_id,
             duplicate_status, item_status, is_selected, issues, sync_status,
             created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, 'synced', ?, ?)
           ON CONFLICT (id) DO UPDATE SET
             final_category_id = excluded.final_category_id,
             duplicate_status = excluded.duplicate_status,
             item_status = excluded.item_status,
             is_selected = excluded.is_selected, issues = excluded.issues,
             updated_at = excluded.updated_at
           WHERE import_items.sync_status = 'synced'`,
          item.id,
          review.id,
          spaceId,
          item.sourceRow,
          item.rawDescription,
          item.normalizedMerchant,
          item.occurredOn,
          item.amountMinor,
          item.currency,
          item.movementType,
          categoryId,
          item.duplicateStatus,
          item.itemStatus,
          item.selected ? 1 : 0,
          JSON.stringify(item.issues),
          item.createdAt,
          item.updatedAt,
        );
      }
    }
  });
}
