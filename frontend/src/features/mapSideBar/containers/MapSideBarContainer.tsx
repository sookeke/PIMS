import * as React from 'react';
import MapSideBarLayout from '../components/MapSideBarLayout';
import useParamSideBar, { SidebarContextType } from '../hooks/useQueryParamSideBar';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'reducers/rootReducer';
import { IPropertyDetail, IParcel, IProperty, IBuilding } from 'actions/parcelsActions';
import { fetchParcelDetail, fetchParcelsDetail } from 'actionCreators/parcelsActionCreator';
import useDeepCompareEffect from 'hooks/useDeepCompareEffect';
import { BuildingForm, SubmitPropertySelector, LandForm } from '../SidebarContents';
import { BuildingSvg, LandSvg } from 'components/common/Icons';
import { FormikValues, setIn, getIn } from 'formik';
import { useState, useEffect } from 'react';
import useGeocoder from 'features/properties/hooks/useGeocoder';
import { isMouseEventRecent } from 'utils';
import {
  handleParcelDataLayerResponse,
  PARCELS_LAYER_URL,
  useLayerQuery,
} from 'components/maps/leaflet/LayerPopup';
import { LeafletMouseEvent, LatLng } from 'leaflet';
import AssociatedLandForm from '../SidebarContents/AssociatedLandForm';
import { toast } from 'react-toastify';
import _ from 'lodash';
import useKeycloakWrapper from 'hooks/useKeycloakWrapper';
import GenericModal, { ModalSize } from 'components/common/GenericModal';
import { FaCheckCircle } from 'react-icons/fa';
import styled from 'styled-components';
import {
  IFinancialYear,
  getMergedFinancials,
} from 'features/properties/components/forms/subforms/EvaluationForm';
import { Spinner } from 'react-bootstrap';
import { ViewOnlyLandForm } from '../SidebarContents/LandForm';

interface IMapSideBarContainerProps {
  refreshParcels: Function;
  properties: IProperty[];
  movingPinNameSpaceProp?: string;
}

export interface IFormBuilding extends IBuilding {
  financials: IFinancialYear[];
}
export interface IFormParcel extends IParcel {
  financials: IFinancialYear[];
}

const FloatCheck = styled(FaCheckCircle)`
  margin: 1em;
  color: #2e8540;
  float: left;
`;

const SuccessText = styled.p`
  color: #2e8540;
  margin-bottom: 0;
  font-size: 24px;
`;

const BoldText = styled.p`
  font-size: 24px;
  fontweight: 700;
`;

/**
 * container responsible for logic related to map sidebar display. Synchronizes the state of the parcel detail forms with the corresponding query parameters (push/pull).
 */
const MapSideBarContainer: React.FunctionComponent<IMapSideBarContainerProps> = ({
  movingPinNameSpaceProp,
}) => {
  const {
    showSideBar,
    setShowSideBar,
    parcelId,
    context,
    size,
    addBuilding,
    addRawLand,
    addAssociatedLand,
    addContext,
    disabled,
  } = useParamSideBar();
  const dispatch = useDispatch();
  let activePropertyDetail = useSelector<RootState, IPropertyDetail>(
    state => state.parcel?.parcelDetail as IPropertyDetail,
  );
  const [cachedParcelDetail, setCachedParcelDetail] = React.useState<IFormParcel | null>(null);

  const [movingPinNameSpace, setMovingPinNameSpace] = useState<string | undefined>(
    movingPinNameSpaceProp,
  );
  const leafletMouseEvent = useSelector<RootState, LeafletMouseEvent | null>(
    state => state.leafletClickEvent?.mapClickEvent,
  );
  const [buildingToAssociateLand, setBuildingToAssociateLand] = useState<IBuilding | undefined>();
  const [showAssociateLandModal, setShowAssociateLandModal] = useState(false);
  const [propertyType, setPropertyType] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const formikRef = React.useRef<FormikValues>();
  const parcelsService = useLayerQuery(PARCELS_LAYER_URL);

  useEffect(() => {
    if (buildingToAssociateLand !== undefined) {
      setShowAssociateLandModal(true);
    }
  }, [buildingToAssociateLand]);

  const withNameSpace: Function = (fieldName: string, nameSpace?: string) => {
    return nameSpace ? `${nameSpace}.${fieldName}` : fieldName;
  };

  /**
   * Attempt to fetch the parcel within PIMS matching the passed pid or pin value. If that request fails, make another request to the parcel layer with the same data.
   * @param pidOrPin
   * @param parcelLayerSearchCallback
   * @param nameSpace
   */
  const fetchPimsOrLayerParcel = (
    pidOrPin: any,
    parcelLayerSearchCallback: () => void,
    nameSpace?: string,
  ) => {
    fetchParcelsDetail(pidOrPin)(dispatch).then(resp => {
      const matchingParcel: any = resp?.data?.length ? _.first(resp?.data) : undefined;
      if (!!formikRef?.current?.values && !!matchingParcel?.id) {
        const { resetForm, values } = formikRef.current;
        matchingParcel.searchPid = getIn(values, withNameSpace('searchPid', nameSpace));
        matchingParcel.searchPin = getIn(values, withNameSpace('searchPin', nameSpace));
        matchingParcel.searchAddress = getIn(values, withNameSpace('seachAddress', nameSpace));
        matchingParcel.financials = getMergedFinancials([
          ...matchingParcel.evaluations,
          ...matchingParcel.fiscals,
        ]);
        resetForm({ values: setIn(values, nameSpace ?? '', matchingParcel) });
        toast.dark('Found matching parcel within PIMS. Form data will be pre-populated.', {
          autoClose: 7000,
        });
      } else {
        parcelLayerSearchCallback();
      }
    });
  };
  const { handleGeocoderChanges } = useGeocoder({ formikRef, fetchPimsOrLayerParcel });

  /** query pims for the given pid, set data within the form if match found. Fallback to querying the parcel data layer. */
  const handlePidChange = (pid: string, nameSpace?: string) => {
    const parcelLayerSearchCallback = () => {
      const response = parcelsService.findByPid(pid);
      handleParcelDataLayerResponse(response, dispatch);
    };
    fetchPimsOrLayerParcel({ pid }, parcelLayerSearchCallback, nameSpace);
  };

  /** make a parcel layer request by pid and store the response. */
  const handlePinChange = (pin: string, nameSpace?: string) => {
    const parcelLayerSearchCallback = () => {
      const response = parcelsService.findByPin(pin);
      handleParcelDataLayerResponse(response, dispatch);
    };
    fetchPimsOrLayerParcel({ pin }, parcelLayerSearchCallback, nameSpace);
  };
  const droppedMarkerSearch = (nameSpace: string, latLng?: LatLng) => {
    if (latLng) {
      parcelsService.findOneWhereContains(latLng).then(resp => {
        const properties = getIn(resp, 'features.0.properties');
        if (properties?.PIN || properties?.PID) {
          const query: any = { pin: properties?.PIN, pid: properties.PID };
          fetchParcelsDetail(query)(dispatch).then((resp: any) => {
            const matchingParcel: any = resp?.data?.length ? _.first(resp?.data) : undefined;
            if (!!nameSpace && !!formikRef?.current?.values && !!matchingParcel?.id) {
              const { resetForm, values } = formikRef.current;
              resetForm({ values: setIn(values, nameSpace, matchingParcel) });
              toast.dark('Found matching parcel within PIMS. Form data will be pre-populated.', {
                autoClose: 7000,
              });
            } else {
              const response = properties.PID
                ? parcelsService.findByPid(properties.PID)
                : parcelsService.findByPin(properties.PIN);

              handleParcelDataLayerResponse(response, dispatch);
            }
          });
        }
      });
    }
  };

  const keycloak = useKeycloakWrapper();

  React.useEffect(() => {
    if (movingPinNameSpace !== undefined) {
      document.body.className = propertyType === 'building' ? 'building-cursor' : 'parcel-cursor';
    }
    return () => {
      //make sure to reset the cursor when this component is disposed.
      document.body.className = '';
    };
  }, [propertyType, movingPinNameSpace]);

  //Add a pin to the map where the user has clicked.
  useDeepCompareEffect(() => {
    //If we click on the map, create a new pin at the click location.
    if (
      movingPinNameSpace !== undefined &&
      !!formikRef?.current &&
      isMouseEventRecent(leafletMouseEvent?.originalEvent)
    ) {
      let nameSpace = (movingPinNameSpace?.length ?? 0) > 0 ? `${movingPinNameSpace}.` : '';
      if (propertyType === 'land') {
        formikRef.current.setFieldValue(`${nameSpace}latitude`, leafletMouseEvent?.latlng.lat || 0);
        formikRef.current.setFieldValue(
          `${nameSpace}longitude`,
          leafletMouseEvent?.latlng.lng || 0,
        );
        !parcelId && droppedMarkerSearch(movingPinNameSpace, leafletMouseEvent?.latlng);
      } else {
        formikRef.current.setFieldValue(`data.latitude`, leafletMouseEvent?.latlng.lat || 0);
        formikRef.current.setFieldValue(`data.longitude`, leafletMouseEvent?.latlng.lng || 0);
      }

      setMovingPinNameSpace(undefined);
    }
  }, [dispatch, leafletMouseEvent]);

  useDeepCompareEffect(() => {
    if (showSideBar && parcelId) {
      if (
        parcelId !== cachedParcelDetail?.id &&
        parcelId !== activePropertyDetail?.parcelDetail?.id
      ) {
        addContext(SidebarContextType.LOADING);
        dispatch(fetchParcelDetail({ id: parcelId }));
      } else if (
        parcelId === activePropertyDetail?.parcelDetail?.id &&
        activePropertyDetail?.propertyTypeId === 0
      ) {
        setCachedParcelDetail({
          ...activePropertyDetail?.parcelDetail,
          financials: getMergedFinancials([
            ...(activePropertyDetail?.parcelDetail?.evaluations ?? []),
            ...(activePropertyDetail?.parcelDetail?.fiscals ?? []),
          ]),
        });
        if (!!activePropertyDetail?.parcelDetail?.buildings?.length) {
          addContext(
            disabled
              ? SidebarContextType.VIEW_DEVELOPED_LAND
              : SidebarContextType.UPDATE_DEVELOPED_LAND,
          );
        } else {
          addContext(
            disabled ? SidebarContextType.VIEW_RAW_LAND : SidebarContextType.UPDATE_RAW_LAND,
          );
        }
      }
    } else if (showSideBar && !parcelId) {
      if (!!cachedParcelDetail) {
        setCachedParcelDetail(null);
      }
    }
  }, [
    dispatch,
    parcelId,
    disabled,
    showSideBar,
    (activePropertyDetail?.parcelDetail as any)?.rowVersion,
  ]);

  const getSidebarTitle = (): React.ReactNode => {
    switch (context) {
      case SidebarContextType.ADD_BUILDING:
        return (
          <>
            <BuildingSvg className="svg" /> Submit a Building (to inventory)
          </>
        );
      case SidebarContextType.ADD_RAW_LAND:
        return (
          <>
            <LandSvg className="svg" /> Submit Raw Land (to inventory)
          </>
        );
      case SidebarContextType.VIEW_RAW_LAND:
      case SidebarContextType.UPDATE_RAW_LAND:
        return (
          <>
            <LandSvg className="svg" /> View/Update bare land
          </>
        );
      case SidebarContextType.VIEW_DEVELOPED_LAND:
      case SidebarContextType.UPDATE_DEVELOPED_LAND:
        return (
          <>
            <LandSvg className="svg" /> View/Update developed land
          </>
        );
      case SidebarContextType.ADD_ASSOCIATED_LAND:
        return (
          <>
            <LandSvg className="svg" /> Add associated land
          </>
        );
      case SidebarContextType.VIEW_BUILDING:
        return 'Building Details';
      default:
        return 'Submit a Property';
    }
  };

  const render = (): React.ReactNode => {
    switch (context) {
      case SidebarContextType.ADD_BUILDING:
        if (propertyType !== 'building') {
          setPropertyType('building');
        }
        return (
          <BuildingForm
            formikRef={formikRef}
            setMovingPinNameSpace={setMovingPinNameSpace}
            nameSpace="data"
            setBuildingToAssociateLand={setBuildingToAssociateLand}
            isAdmin={keycloak.isAdmin}
          />
        );
      case SidebarContextType.ADD_RAW_LAND:
      case SidebarContextType.UPDATE_DEVELOPED_LAND:
      case SidebarContextType.UPDATE_RAW_LAND:
        if (propertyType !== 'land') {
          setPropertyType('land');
        }
        return parcelId === cachedParcelDetail?.id ? (
          <LandForm
            setMovingPinNameSpace={setMovingPinNameSpace}
            formikRef={formikRef}
            handleGeocoderChanges={handleGeocoderChanges}
            handlePidChange={handlePidChange}
            handlePinChange={handlePinChange}
            isAdmin={keycloak.isAdmin}
            setLandComplete={setShowCompleteModal}
            initialValues={cachedParcelDetail ?? ({} as any)}
          />
        ) : (
          <Spinner animation="border"></Spinner>
        );
      case SidebarContextType.VIEW_RAW_LAND:
      case SidebarContextType.VIEW_DEVELOPED_LAND:
        if (propertyType !== 'land') {
          setPropertyType('land');
        }
        return parcelId === cachedParcelDetail?.id ? (
          <ViewOnlyLandForm
            formikRef={formikRef}
            initialValues={cachedParcelDetail ?? ({} as any)}
          />
        ) : (
          <Spinner animation="border"></Spinner>
        );
      case SidebarContextType.ADD_ASSOCIATED_LAND:
        if (propertyType !== 'land') {
          setPropertyType('land');
        } else if (!buildingToAssociateLand?.id) {
          //if the associated building doesn't have an id, we can't load it.
          setShowSideBar(true, SidebarContextType.ADD_PROPERTY_TYPE_SELECTOR, 'narrow');
        }
        return (
          <AssociatedLandForm
            setMovingPinNameSpace={setMovingPinNameSpace}
            formikRef={formikRef}
            handleGeocoderChanges={handleGeocoderChanges}
            handlePidChange={handlePidChange}
            handlePinChange={handlePinChange}
            initialValues={buildingToAssociateLand ?? ({} as any)}
            isAdmin={keycloak.isAdmin}
            setAssociatedLandComplete={setShowCompleteModal}
          />
        );
      case SidebarContextType.LOADING:
        return <Spinner animation="border"></Spinner>;
      default:
        return <SubmitPropertySelector addBuilding={addBuilding} addRawLand={addRawLand} />;
    }
  };

  return (
    <MapSideBarLayout
      title={getSidebarTitle()}
      show={showSideBar}
      setShowSideBar={setShowSideBar}
      size={size}
      hidePolicy={true}
    >
      {render()}
      <GenericModal
        size={ModalSize.LARGE}
        message={
          <>
            <FloatCheck size={32}></FloatCheck>
            <SuccessText>Success!</SuccessText>
            <p>Your building has been added to the PIMS inventory</p>
            <BoldText>Would you like to associate land to this building?</BoldText>
          </>
        }
        display={showAssociateLandModal}
        cancelButtonText="No, I'm done"
        okButtonText="Yes, add land"
        handleOk={() => {
          addAssociatedLand();
          setShowAssociateLandModal(false);
        }}
        handleCancel={() => {
          setShowSideBar(false);
          setShowAssociateLandModal(false);
        }}
      ></GenericModal>
      <GenericModal
        size={ModalSize.LARGE}
        message={
          <>
            <FloatCheck size={32}></FloatCheck>
            <SuccessText>Success!</SuccessText>
            <p>Your land has been added to the PIMS inventory</p>
            <BoldText>Would you like to continue adding to the inventory?</BoldText>
          </>
        }
        display={showCompleteModal}
        cancelButtonText="No, I'm done"
        okButtonText="Yes"
        handleOk={() => {
          setShowSideBar(true, SidebarContextType.ADD_PROPERTY_TYPE_SELECTOR, 'narrow', true);
          setShowCompleteModal(false);
          setCachedParcelDetail(null);
        }}
        handleCancel={() => {
          setShowSideBar(false);
          setShowCompleteModal(false);
          setCachedParcelDetail(null);
        }}
      ></GenericModal>
    </MapSideBarLayout>
  );
};

export default MapSideBarContainer;
