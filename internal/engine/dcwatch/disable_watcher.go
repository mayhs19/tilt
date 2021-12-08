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

// How does the `New` function relate to the subscriber we're creating?
func NewDisableEventWatcher(dcc dockercompose.DockerComposeClient) *EventWatcher {
	return &EventWatcher{
		dcc: dcc,
	}
}

// Question for Matt: how is the `DisableSubscriber` typed as a subscriber? Is Go just smart enough to know that the `OnChange` method is part of the Subscriber interface type?
// ...is it because interfaces are implemented implicitly? (So says the Go documentation, lol)
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

	var specsToDisable []model.DockerComposeUpSpec
	for _, uir := range state.UIResources {
		if uir.Status.DisableStatus.DisabledCount > 0 {
			manifest, exists := state.ManifestTargets[model.ManifestName(uir.Name)]
			if !exists {
				continue
			}

			if !manifest.State.IsDC() {
				continue
			}

			rs := manifest.State.DCRuntimeState().RuntimeStatus()
			if rs == v1alpha1.RuntimeStatusOK || rs == v1alpha1.RuntimeStatusPending {
				dcSpec := model.DockerComposeUpSpec{
					Service: string(manifest.State.Name),
					Project: manifest.Manifest.DockerComposeTarget().Spec.Project,
				}
				specsToDisable = append(specsToDisable, dcSpec)
			}
		}

		if len(specsToDisable) > 0 {
			// Call `down` from dcc!
		}
	}

	return nil
}
