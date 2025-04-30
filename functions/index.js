// functions/index.js

const { onDocumentDeleted } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.deleteCaseImages = onDocumentDeleted('cases/{caseId}', async (event) => {
  const caseId = event.params.caseId;
  const deletedData = event.data?.data();
  const images = deletedData?.images || [];

  if (images.length === 0) {
    logger.info(`Case ${caseId} has no images to delete`);
    return;
  }

  const storage = admin.storage();
  const bucket = storage.bucket();

  try {
    const deletePromises = images.map(async (imageUrl) => {
      try {
        const path = decodeURIComponent(imageUrl.split('/o/')[1].split('?')[0]);
        await bucket.file(path).delete();
        logger.info(`Deleted image: ${path} for case ${caseId}`);
      } catch (error) {
        logger.error(`Failed to delete image ${imageUrl} for case ${caseId}:`, error);
      }
    });

    await Promise.all(deletePromises);
    logger.info(`Successfully deleted all images for case ${caseId}`);
  } catch (error) {
    logger.error(`Error processing case ${caseId}:`, error);
  }
});