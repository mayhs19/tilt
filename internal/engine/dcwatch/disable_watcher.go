package dcwatch

import (
	"context"

	"github.com/tilt-dev/tilt/internal/dockercompose"
	"github.com/tilt-dev/tilt/internal/store"
	"github.com/tilt-dev/tilt/pkg/apis/core/v1alpha1"
	"github.com/tilt-dev/tilt/pkg/model"
)

type DisableSubscriber struct {
	dcc dockercompose.DockerComposeClient
}

func NewDisableEventWatcher(dcc dockercompose.DockerComposeClient) *EventWatcher {
	return &EventWatcher{
		dcc: dcc,
	}
}

func (w *DisableSubscriber) OnChange(ctx context.Context, st store.RStore, summary store.ChangeSummary) error {
	if summary.IsLogOnly() {
		return nil
	}

	state := st.RLockState()
	project := state.DockerComposeProject()
	st.RUnlockState()

	if model.IsEmptyDockerComposeProject(project) {
		return nil
	}

	for _, uir := range state.UIResources {
		if uir.Status.DisableStatus.DisabledCount > 0 {
			manifest, exists := state.ManifestTargets[model.ManifestName(uir.Name)]
			if !exists {
				continue
			}

			if manifest.State.IsDC() {
				continue
			}

			rs := manifest.State.DCRuntimeState().RuntimeStatus()
			if rs == v1alpha1.RuntimeStatusOK || rs == v1alpha1.RuntimeStatusPending {
				// TODO: Add support to dcClient.Down to take a list of specs to `down`, rather than a project
				// w.dcc.Down()
			}
		}
	}

	return nil
}
