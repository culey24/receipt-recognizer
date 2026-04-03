from datetime import datetime, timezone

from src.models.job_schema import OCRJob, JobStatus


class JobRepository:
    def __init__(self, collection) -> None:
        self.collection = collection

    async def save(self, job: OCRJob) -> None:
        await self.collection.update_one(
            {"job_id": job.job_id},
            {"$set": job.model_dump(mode="json")},
            upsert=True,
        )

    async def get(self, job_id: str) -> OCRJob | None:
        raw = await self.collection.find_one({"job_id": job_id})
        if raw is None:
            return None
        raw.pop("_id", None)
        return OCRJob.model_validate(raw)

    async def list_jobs(self, limit: int = 50) -> list[OCRJob]:
        cursor = self.collection.find({}).sort("updated_at", -1).limit(limit)
        jobs: list[OCRJob] = []
        async for raw in cursor:
            raw.pop("_id", None)
            jobs.append(OCRJob.model_validate(raw))
        return jobs

    async def update(
        self,
        job_id: str,
        *,
        status: JobStatus,
        result=None,
        error_message: str | None = None,
        model_used: str | None = None,
    ) -> OCRJob | None:
        job = await self.get(job_id)
        if job is None:
            return None

        job.status = status
        job.error_code = status
        job.updated_at = datetime.now(timezone.utc)
        job.result = result
        job.error_message = error_message
        if model_used is not None:
            job.model_used = model_used
        await self.save(job)
        return job
