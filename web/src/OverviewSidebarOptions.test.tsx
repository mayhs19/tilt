import { mount, ReactWrapper } from "enzyme"
import React from "react"
import { MemoryRouter } from "react-router"
import {
  cleanupMockAnalyticsCalls,
  mockAnalyticsCalls,
} from "./analytics_test_helpers"
import { accessorsForTesting, tiltfileKeyContext } from "./BrowserStorage"
import {
  TestsWithErrors,
  TwoResourcesTwoTests,
} from "./OverviewResourceSidebar.stories"
import {
  AlertsOnTopToggle,
  OverviewSidebarOptions,
} from "./OverviewSidebarOptions"
import {
  DEFAULT_OPTIONS,
  ResourceListOptions,
  ResourceListOptionsProvider,
  RESOURCE_LIST_OPTIONS_KEY,
} from "./ResourceListOptionsContext"
import { ResourceNameFilterTextField } from "./ResourceNameFilter"
import SidebarItemView from "./SidebarItemView"
import SidebarResources, { SidebarListSection } from "./SidebarResources"
import { StarredResourcesContextProvider } from "./StarredResourcesContext"

const resourceListOptionsAccessor = accessorsForTesting<ResourceListOptions>(
  RESOURCE_LIST_OPTIONS_KEY,
  sessionStorage
)

export function assertSidebarItemsAndOptions(
  root: ReactWrapper,
  names: string[],
  expectAlertsOnTop: boolean,
  expectedResourceNameFilter?: string
) {
  let sidebar = root.find(SidebarResources)
  expect(sidebar).toHaveLength(1)

  // only check items in the "all resources" section, i.e. don't look at starred things
  // or we'll have duplicates
  let all = sidebar.find(SidebarListSection)
  let items = all.find(SidebarItemView)
  const observedNames = items.map((i) => i.props().item.name)
  expect(observedNames).toEqual(names)

  let optSetter = sidebar.find(OverviewSidebarOptions)
  expect(optSetter).toHaveLength(1)
  expect(optSetter.find(AlertsOnTopToggle).hasClass("is-enabled")).toEqual(
    expectAlertsOnTop
  )
  if (expectedResourceNameFilter !== undefined) {
    expect(optSetter.find(ResourceNameFilterTextField).props().value).toEqual(
      expectedResourceNameFilter
    )
  }
}

const allNames = ["(Tiltfile)", "vigoda", "snack", "beep", "boop"]

describe("overview sidebar options", () => {
  beforeEach(() => {
    mockAnalyticsCalls()
  })

  afterEach(() => {
    cleanupMockAnalyticsCalls()
    localStorage.clear()
  })

  it("shows all resources by default", () => {
    const root = mount(TwoResourcesTwoTests())
    assertSidebarItemsAndOptions(root, allNames, false)
  })

  it("applies the name filter", () => {
    // 'B p' tests both case insensitivity and a multi-term query
    resourceListOptionsAccessor.set({
      ...DEFAULT_OPTIONS,
      resourceNameFilter: "B p",
    })
    const root = mount(
      <MemoryRouter>
        <tiltfileKeyContext.Provider value="test">
          <ResourceListOptionsProvider>
            <StarredResourcesContextProvider>
              {TwoResourcesTwoTests()}
            </StarredResourcesContextProvider>
          </ResourceListOptionsProvider>
        </tiltfileKeyContext.Provider>
      </MemoryRouter>
    )

    assertSidebarItemsAndOptions(
      root,
      ["beep", "boop"],
      DEFAULT_OPTIONS.alertsOnTop,
      "B p"
    )
  })

  it("says no matches found", () => {
    resourceListOptionsAccessor.set({
      ...DEFAULT_OPTIONS,
      resourceNameFilter: "asdfawfwef",
    })
    const root = mount(
      <MemoryRouter>
        <tiltfileKeyContext.Provider value="test">
          <ResourceListOptionsProvider>
            <StarredResourcesContextProvider>
              {TwoResourcesTwoTests()}
            </StarredResourcesContextProvider>
          </ResourceListOptionsProvider>
        </tiltfileKeyContext.Provider>
      </MemoryRouter>
    )

    const resourceSectionItems = root.find(SidebarListSection).find("li")
    expect(resourceSectionItems.map((n) => n.text())).toEqual([
      "No matching resources",
    ])
  })
})

it("toggles/untoggles Alerts On Top sorting when button clicked", () => {
  const root = mount(TestsWithErrors())

  const origOrder = [
    "(Tiltfile)",
    "test_0",
    "test_1",
    "test_2",
    "test_3",
    "test_4",
    "test_5",
    "test_6",
    "test_7",
  ]
  const alertsOnTopOrder = [
    "test_0",
    "test_2",
    "test_4",
    "test_6",
    "(Tiltfile)",
    "test_1",
    "test_3",
    "test_5",
    "test_7",
  ]
  assertSidebarItemsAndOptions(root, origOrder, false)

  let aotToggle = root.find(AlertsOnTopToggle)
  aotToggle.simulate("click")

  assertSidebarItemsAndOptions(root, alertsOnTopOrder, true)

  aotToggle.simulate("click")
  assertSidebarItemsAndOptions(root, origOrder, false)
})
