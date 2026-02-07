<?php

namespace App\Traits;

use App\Exceptions\ConcurrentModificationException;
use Illuminate\Database\Eloquent\Model;

trait HasOptimisticLocking
{
    /**
     * Boot the optimistic locking trait for a model.
     */
    protected static function bootHasOptimisticLocking(): void
    {
        static::updating(function (Model $model) {
            if (!$model->isDirty('version')) {
                $model->incrementVersion();
            }
        });

        static::updated(function (Model $model) {
            if ($model->wasChanged() && !$model->wasChanged('version')) {
                // If update succeeded but version wasn't changed, it means no rows were affected
                // This indicates a concurrent modification
                $expectedVersion = $model->getOriginal('version');
                $actualVersion = $model->getAttribute('version');

                if ($expectedVersion !== $actualVersion) {
                    throw new ConcurrentModificationException(
                        get_class($model),
                        $model->getKey(),
                        $expectedVersion,
                        $actualVersion
                    );
                }
            }
        });
    }

    /**
     * Increment the version number.
     */
    protected function incrementVersion(): void
    {
        $this->version = ($this->version ?? 0) + 1;
    }

    /**
     * Perform an update with optimistic locking.
     */
    public function updateWithLock(array $attributes): bool
    {
        $currentVersion = $this->version ?? 0;

        // Add version check to the update query
        $affected = static::where($this->getKeyName(), $this->getKey())
            ->where('version', $currentVersion)
            ->update(array_merge($attributes, ['version' => $currentVersion + 1]));

        if ($affected === 0) {
            // No rows affected means version mismatch (concurrent modification)
            $fresh = static::find($this->getKey());
            throw new ConcurrentModificationException(
                get_class($this),
                $this->getKey(),
                $currentVersion,
                $fresh ? $fresh->version : null
            );
        }

        // Refresh the model to get the new version
        $this->refresh();
        return true;
    }
}
